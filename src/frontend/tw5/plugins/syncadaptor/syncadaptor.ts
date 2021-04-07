import { tiddlerDataSchema } from "../../../../backend/common/schema";
import { TiddlerFactory } from "../../../../backend/common/tiddler-factory";
import { HTTPStoreClient } from "../../../../shared/apiclient/http-store-client";
import { Revision } from "../../../../shared/model/revision";
import { TiddlerData } from "../../../../shared/model/tiddler";
import { User, username } from "../../../../shared/model/user";
import { Config } from "../../../../shared/util/config";
import {
  CallbackFn,
  TW5SyncAdaptor,
  TW5SyncAdaptorTiddlerInfo,
  TW5Tiddler,
  TW5Wiki
} from "../../tw5-types";
import { TW5Transport } from "../tw5-transport";

const CONFIG_TIDDLER = "$:/config/WikiConfig";
const USER_TIDDLER = "$:/temp/user";

const asyncToCallback = (fn: ()=>Promise<any[]>, callback:CallbackFn) => fn().then(
  data => callback(null, ...data),
  callback);

const toTiddlerData = (tiddler:TW5Tiddler):Partial<TiddlerData> => {
  const {text, tags, type, title, ...fields} = tiddler.fields;
  return {text, tags, type, fields};
};

class TW5FirebaseSyncAdaptor implements TW5SyncAdaptor {
  private wiki: TW5Wiki;
  private transport: TW5Transport;
  private tiddlerInfo: { [title: string]: TW5SyncAdaptorTiddlerInfo } = {};
  private tiddlerRevision: { [title: string]: Revision } = {};

  name = "TW5FirebaseSyncAdaptor";
  supportsLazyLoading = false;
  config: Config['wiki'];
  user: User;
  store: HTTPStoreClient;


  constructor(options: { wiki: TW5Wiki }) {
    this.wiki = options.wiki;
    this.config = JSON.parse(
      this.wiki.getTiddlerText(CONFIG_TIDDLER)!
    ) as Config['wiki'];
    this.user = (this.wiki.getTiddler(USER_TIDDLER)!.fields as any) as User;
    this.transport = new TW5Transport(
      this.config.apiEndpoint,
      // TODO: temporary hack to get plugin working, remove this asap:
      ($tw as any)._pnwiki.getIdToken
    );
    this.store = new HTTPStoreClient(this.config.wikiName, this.transport);
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
      false // isAnonymous
    );
  }

  saveTiddler(
    tiddler: TW5Tiddler,
    callback: (err: any, ...data: any[]) => void
  ) {
    asyncToCallback(async () => {
      const title = tiddler.fields.title;
      const originalBag = this.tiddlerInfo[title]?.bag;
      const expectedRevision = this.tiddlerRevision[title];
      const tiddlerData = toTiddlerData(tiddler);
      // TODO1: support writes to bag directly in addition to through recipe
      const writeResult = await this.store.writeToRecipe(
        this.config.recipe,
        title,
        expectedRevision
          ? { update: tiddlerData, expectedRevision }
          : { create: tiddlerData }
      );
      if (writeResult.bag !== originalBag) {
        // log only for now
        // TODO2: if new bag is not the same as original bag, delete tiddler in original bag
        console.log(
          `Tiddler ${title} moved from bag ${originalBag} to ${writeResult.bag}`
        );
      }
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
    options: { tiddlerInfo: { adaptorInfo: TW5SyncAdaptorTiddlerInfo } }
  ) {
    asyncToCallback(async () => {
      const bag = options?.tiddlerInfo?.adaptorInfo?.bag;
      if (bag) {
        // If we don't have a bag it means that the tiddler hasn't been seen by the server, so we don't need to delete it
        await this.store.removeFromBag(bag, title, this.tiddlerRevision[title]);
      }
      return [];
    }, callback);
  }
}

// Only export adaptorClass if config tiddler is set (otherwise the syncadaptor can't work)
export const adaptorClass = $tw.wiki.tiddlerExists(CONFIG_TIDDLER) ? TW5FirebaseSyncAdaptor : null;