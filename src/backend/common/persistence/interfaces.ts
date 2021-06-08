import { Tiddler, TiddlerNamespace } from "../../../shared/model/tiddler";
import { Revision } from "../../../shared/model/revision";

export type MaybePromise<T> = T|Promise<T>

export interface NamespacedTiddler {
  namespace:TiddlerNamespace,
  tiddler:Tiddler,
  revision: Revision};

export interface TiddlerPersistence {
  /* Read all tiddlers from the given bags */
  readBags: (collections:TiddlerNamespace[])=>Promise<Array<NamespacedTiddler>>;
  // true if tiddler existed, false if no such tiddler existed prior to removeTiddler call
  readTiddlers: (requestedTiddlers:Array<{namespace:TiddlerNamespace, title:string}>)=>Promise<Array<NamespacedTiddler>>;
  removeTiddler:(namespace:TiddlerNamespace, title:string, expectedRevision?:Revision)=>Promise<{existed:boolean}>;
  createTiddler:(namespace:TiddlerNamespace, tiddler:Tiddler, revision:Revision)=>Promise<void>;
  updateTiddler:(
    namespace:TiddlerNamespace,
    title:string,
    updater: (oldTiddler:Tiddler)=>MaybePromise<{
      tiddler:Tiddler /* new tiddler */,
      revision:Revision /* new revision */}>,
    expectedRevision?:Revision)=>Promise<{tiddler: Tiddler, revision:Revision}>;
}

export interface TransactionRunner {
  runTransaction<R>(
    updateFunction: (persistence: TiddlerPersistence) => Promise<R>
  ): Promise<R>;
}