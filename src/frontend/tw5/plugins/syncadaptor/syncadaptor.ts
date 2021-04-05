import firebase from "firebase";
import { Revision } from "../../../../shared/model/revision";
import { User, username } from "../../../../shared/model/user";
import { Config } from "../../../../shared/util/config";
import { TW5Transport } from "../tw5-transport";
import {
  CallbackFn,
  TW5SyncAdaptor,
  TW5SyncAdaptorTiddlerInfo,
  TW5Tiddler,
  TW5Wiki,
} from "../../tw5-types";
import { HTTPStoreClient } from "../../../../shared/apiclient/http-store-client";
import { SingleWikiNamespacedTiddler } from "../../../../shared/model/store";

const CONFIG_TIDDLER = "$:/config/WikiConfig";
const USER_TIDDLER = "$:/temp/user";

const asyncToCallback = (fn: ()=>Promise<any[]>, callback:CallbackFn) => fn().then(
  data => callback(null, ...data),
  callback);

export class TW5FirebaseSyncAdaptor implements TW5SyncAdaptor {
  private wiki: TW5Wiki;
  private transport: TW5Transport;
  private tiddlerInfo: { [title: string]: TW5SyncAdaptorTiddlerInfo } = {};
  private tiddlerRevision: { [title: string]: Revision } = {};

  name = "TW5FirebaseSyncAdaptor";
  supportsLazyLoading = false;
  config: Config;
  user: User;
  store: HTTPStoreClient;


  constructor(options: { wiki: TW5Wiki }) {
    this.wiki = options.wiki;
    this.config = JSON.parse(
      this.wiki.getTiddlerText(CONFIG_TIDDLER)!
    ) as Config;
    this.user = (this.wiki.getTiddler(USER_TIDDLER)!.fields as any) as User;
    this.transport = new TW5Transport(
      this.config.wiki.apiEndpoint,
      // TODO: temporary hack to get plugin working, remove this asap:
      ($tw as any)._pnwiki.getIdToken
    );
    this.store = new HTTPStoreClient(this.config.wiki.wikiName, this.transport);
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
      // TODO1: support writes to bag directly in addition to through recipe
      const writeResult = await this.store.writeToRecipe(
        this.config.wiki.recipe,
        title,
        expectedRevision
          ? { update: tiddler.fields, expectedRevision }
          : { create: tiddler.fields }
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
