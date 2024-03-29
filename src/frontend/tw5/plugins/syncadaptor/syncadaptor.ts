import { HTTPStoreClient } from '../../../../shared/apiclient/http-store-client';
import { Revision } from '../../../../shared/model/revision';
import { SingleWikiNamespacedTiddler } from '../../../../shared/model/store';
import { PartialTiddlerData } from '../../../../shared/model/tiddler';
import { User, username } from '../../../../shared/model/user';
import { Config } from '../../../../shared/model/config';
import { CallbackFn, SyncAdaptor, SyncAdaptorTiddlerInfo, TW5Tiddler, Wiki } from '../../tw5-types';
import { TW5Transport } from '../tw5-transport';

const CONFIG_TIDDLER = '$:/config/WikiConfig';
const USER_TIDDLER = '$:/temp/user';

const asyncToCallback = (fn: () => Promise<any[]|void>, callback: CallbackFn) =>
    fn().then(
      // success
      (data) => callback(null, ...(Array.isArray(data) ? data : [])),
      // error (callback's first argument is the error object by convention)
      callback);

const toTiddlerData = (tiddler: TW5Tiddler): PartialTiddlerData => {
    // we don't need to send metadata fields:
    const { text, tags, type, title, created, creator, modified, modifier, ...otherFields } = tiddler.fields;
    return { text, tags, type, fields: otherFields };
};

class TW5FirebaseSyncAdaptor implements SyncAdaptor {
    private wiki: Wiki;
    private transport: TW5Transport;
    private tiddlerInfo: { [title: string]: SyncAdaptorTiddlerInfo };
    private tiddlerRevision: { [title: string]: Revision };
    private config: Config['wiki'];
    private user: User;
    private store: HTTPStoreClient;

    name = 'TW5FirebaseSyncAdaptor';
    supportsLazyLoading = false;

    constructor(options: { wiki: Wiki }) {
        this.wiki = options.wiki;
        this.config = JSON.parse(this.wiki.getTiddlerText(CONFIG_TIDDLER)!) as Config['wiki'];
        this.user = this.wiki.getTiddler(USER_TIDDLER)!.fields as any as User;
        this.transport = new TW5Transport(
            this.config.apiEndpoint,
            // TODO: temporary hack to get plugin working, remove this asap:
            ($tw as any)._pnwiki.getIdToken,
        );
        this.store = new HTTPStoreClient(this.config.wikiName, this.transport);
        // TODO: temporary: get preloaded tiddlers with metadata
        const namespacedTiddlers: SingleWikiNamespacedTiddler[] = ($tw as any)._pnwiki.namespacedTiddlers;
        this.tiddlerInfo = namespacedTiddlers.reduce((acc, { tiddler: { title }, bag }) => {
            acc[title] = { bag };
            return acc;
        }, {} as { [title: string]: SyncAdaptorTiddlerInfo });
        this.tiddlerRevision = namespacedTiddlers.reduce((acc, { tiddler: { title }, revision }) => {
            acc[title] = revision;
            return acc;
        }, {} as { [title: string]: Revision });
    }

    isReady() {
        return true;
    }

    getTiddlerInfo(tiddler: TW5Tiddler) {
        return this.tiddlerInfo[tiddler.fields.title];
    }

    getTiddlerRevision(title: string) {
        return this.tiddlerRevision[title];
    }
    getStatus(callback: (err: any, ...data: any[]) => void) {
        return callback(
            null,
            true, // isLoggedIn
            username(this.user),
            false, //isReadOnly
            false, // isAnonymous
        );
    }

    saveTiddler(tiddler: TW5Tiddler, callback: (err: any, ...data: any[]) => void) {
        asyncToCallback(async () => {
            const title = tiddler.fields.title;
            const originalBag = this.tiddlerInfo[title]?.bag;
            const expectedRevision = this.tiddlerRevision[title];
            const tiddlerData = toTiddlerData(tiddler);
            // TODO: support writes to either recipe or bag depending on config
            // TODO: if write fails due to constraints, then tiddler should be deleted from bag
            //       and written to recipe again (which will presumably place it in a different bag).
            const writeResult = await (originalBag ?
              this.store.updateInBag(originalBag, title, tiddlerData, expectedRevision) :
              this.store.createInRecipe(this.config.recipe, title, tiddlerData));
            // updated saved revision
            const newTiddlerInfo = { bag: writeResult.bag };
            this.tiddlerInfo[title] = newTiddlerInfo;
            this.tiddlerRevision[title] = writeResult.revision;
            return [newTiddlerInfo, writeResult.revision];
        }, callback);
    }

    loadTiddler(title: string, callback: (err: any, ...data: any[]) => void) {
        // TODO: don't need to implement this yet, it's never called unless we have skinny tiddlers
    }

    deleteTiddler(
        title: string,
        callback: (err: any, ...data: any[]) => void,
        options: { tiddlerInfo: { adaptorInfo: SyncAdaptorTiddlerInfo } },
    ) {
        asyncToCallback(async () => {
            const bag = options?.tiddlerInfo?.adaptorInfo?.bag;
            if (bag) {
                // If we don't have a bag it means that the tiddler hasn't been seen by the server, so we don't need to delete it
                console.log(`debug delete: ${bag} ${title} rev ${this.tiddlerRevision[title]}`);
                await this.store.deleteFromBag(bag, title, this.tiddlerRevision[title]);
            }
            delete this.tiddlerInfo[title];
            delete this.tiddlerRevision[title];
            return;
        }, callback);
    }
}

// Only export adaptorClass if config tiddler is set (otherwise the syncadaptor can't work)
export const adaptorClass = $tw.wiki.tiddlerExists(CONFIG_TIDDLER) ? TW5FirebaseSyncAdaptor : null;
