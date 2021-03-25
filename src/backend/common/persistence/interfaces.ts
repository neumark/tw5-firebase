import { Tiddler, TiddlerNamespace } from "../../../shared/model/tiddler";
import { Revision } from "../../../shared/model/revision";
import { User } from "../../../shared/model/user";


export type MaybePromise<T> = T|Promise<T>

export interface Persistence<K, REV, V, NS> {
  readDocs: (documentKeys:Array<{namespace:NS, key:K}>)=>Promise<Array<{namespace:NS, key:K, value:V, revision:REV}>>;
  readCollections: (collections:NS[])=>Promise<Array<{namespace:NS, key:K, value:V, revision: REV}>>;
  updateDoc:(namespace:NS, documentKey:K, updater: (oldValue?:V)=>MaybePromise<V|undefined>, expectedRevision?:REV)=>Promise<{namespace:NS, key:K, value: V, revision:REV}|undefined>;
}

export type StandardTiddlerPersistence = Persistence<string, Revision, Tiddler, TiddlerNamespace>;

export interface TransactionRunner {
  runTransaction<R>(
    user: User,
    updateFunction: (persistence: StandardTiddlerPersistence) => Promise<R>
  ): Promise<R>;
}