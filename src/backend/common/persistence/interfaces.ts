import { Tiddler, TiddlerNamespace } from "../../../shared/model/tiddler";
import { Revision } from "../../../shared/model/revision";
import { User } from "../../../shared/model/user";


export type MaybePromise<T> = T|Promise<T>

export interface TiddlerPersistence {
  readDocs: (docs:Array<{namespace:TiddlerNamespace, title:string}>)=>Promise<Array<{namespace:TiddlerNamespace, title:string, value:Tiddler, revision:Revision}>>;
  readCollections: (collections:TiddlerNamespace[])=>Promise<Array<{namespace:TiddlerNamespace, title:string, value:Tiddler, revision: Revision}>>;
  updateDoc:(namespace:TiddlerNamespace, title:string, updater: (oldValue?:Tiddler)=>MaybePromise<Tiddler|undefined>, expectedRevision?:Revision)=>Promise<{namespace:TiddlerNamespace, title:string, value: Tiddler, revision:Revision}|undefined>;
}

export interface TransactionRunner {
  runTransaction<R>(
    user: User,
    updateFunction: (persistence: TiddlerPersistence) => Promise<R>
  ): Promise<R>;
}