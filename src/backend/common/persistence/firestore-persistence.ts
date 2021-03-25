import * as admin from "firebase-admin";
import { inject, injectable } from "inversify";
import { getRevision, Revision } from "../../../shared/model/revision";
import { Tiddler, TiddlerNamespace } from "../../../shared/model/tiddler";
import { Modify } from "../../../shared/util/modify";
import { HTTPError, HTTP_CONFLICT } from "../../api/errors";
import { Component } from "../ioc/components";
import {
  MaybePromise,
  Persistence,
  StandardTiddlerPersistence,
  TransactionRunner,
} from "./interfaces";
import { TransformingTiddlerPersistence } from "./transforming-persistence";
import {
  getTimestamp as _getTimestamp,
} from "../../../shared/util/time";
import { User } from "../../../shared/model/user";

type Transaction = admin.firestore.Transaction;
type Database = admin.firestore.Firestore;
type Timestamp = admin.firestore.Timestamp;

// Override Date fields as strings and remove bag field in DB serialized version
export type FirestoreSerializedTiddler = Modify<
  Tiddler,
  {
    // convert timestamps to firestore-native timestamp type
    created: Timestamp;
    modified: Timestamp;
    // add the revision field
    revision?: string;
  }
>;

const asyncMap = async <T, R = any>(list: T[], fn: (e: T) => Promise<R>) =>
  await Promise.all(list.map(fn));

// Note: theoretically, tiddlers with different titles could be considered the same due to this transformation.
const stringToFirebaseDocName = (str: string) => str.replace(/\//g, "_");

const makeKey = (ns: TiddlerNamespace, key?: string) => {
  const bag = `wikis/${stringToFirebaseDocName(
    ns.wiki
  )}/bags/${stringToFirebaseDocName(ns.bag)}/tiddlers`;
  if (key) {
    return `${bag}/${stringToFirebaseDocName(key)}`;
  }
  return bag;
};

export class FirestorePersistence
  implements
    Persistence<
      string,
      Revision,
      FirestoreSerializedTiddler,
      TiddlerNamespace
    > {
  private user: User;
  private tx: Transaction;
  private db: Database;
  private getTimestamp: typeof _getTimestamp;

  constructor(
    user: User,
    tx: Transaction,
    db: Database,
    getTimestamp: typeof _getTimestamp
  ) {
    this.user = user;
    this.tx = tx;
    this.db = db;
    this.getTimestamp = getTimestamp;
  }
  async readDocs(
    documentKeys: { namespace: TiddlerNamespace; key: string }[]
  ): Promise<
    {
      namespace: TiddlerNamespace;
      key: string;
      value: FirestoreSerializedTiddler;
      revision: Revision;
    }[]
  > {
    const refs = documentKeys.map((docKey) =>
      this.db.doc(makeKey(docKey.namespace, docKey.key))
    );
    return (
      (await this.tx.getAll(...refs))
        // associate each doc with it's index
        .map((doc, ix) => ({ doc, ix }))
        // filter out docs which don't exist in firestore
        .filter(({ doc }) => doc.exists)
        // return in format of interface
        .map(({ doc, ix }) => {
          const value = doc.data() as FirestoreSerializedTiddler;
          return { revision: value.revision!, value, ...documentKeys[ix] };
        })
    );
  }
  async readCollections(
    namespaces: TiddlerNamespace[]
  ): Promise<
    {
      namespace: TiddlerNamespace;
      key: string;
      value: FirestoreSerializedTiddler;
      revision: Revision;
    }[]
  > {
    const allCollections = await asyncMap(
      namespaces,
      async (namespace: TiddlerNamespace) => ({
        namespace,
        cursor: await this.tx.get(this.db.collection(makeKey(namespace))),
      })
    );
    const allDocs = allCollections.map(({ namespace, cursor }) =>
      cursor.docs.map((doc) => {
        const value = doc.data() as FirestoreSerializedTiddler;
        return { namespace, key: value.title, value, revision: value.revision! };
      })
    );
    return allDocs.flat();
  }

  async updateDoc(
    namespace: TiddlerNamespace,
    key: string,
    updater: (
      value?: FirestoreSerializedTiddler
    ) => MaybePromise<FirestoreSerializedTiddler | undefined>,
    expectedRevision?: string
  ): Promise<
    | {
        namespace: TiddlerNamespace;
        key: string;
        value: FirestoreSerializedTiddler;
        revision: Revision;
      }
    | undefined
  > {
    const docs = await this.readDocs([{ namespace, key }]);
    let existingValue = docs.length > 0 ? docs[0].value : undefined;
    if (
      existingValue &&
      expectedRevision &&
      existingValue.revision !== expectedRevision
    ) {
      throw new HTTPError(
        `revision conflict: Tiddler ${JSON.stringify({
          key,
          ...namespace,
        })} has revision ${
          existingValue.revision
        }, attempted update expected revision ${expectedRevision}`,
        HTTP_CONFLICT
      );
    }
    const updatedDoc = await Promise.resolve(updater(existingValue));
    if (updatedDoc) {
      this.tx.set(this.db.doc(makeKey(namespace, key)), updatedDoc);
      return {
        namespace,
        key,
        value: updatedDoc,
        revision: getRevision(this.user, this.getTimestamp()),
      };
    } else {
      this.tx.delete(this.db.doc(makeKey(namespace, key)));
    }
    return updatedDoc;
  }
}

export const firestoreTimestampToDate = (ts: Timestamp): Date =>
  ts.toDate();

const decode = (serializedTiddler: FirestoreSerializedTiddler): Tiddler => {
  const {revision, ...rest} = serializedTiddler;
  return {
    ...rest,
    created: firestoreTimestampToDate(serializedTiddler.created),
    modified: firestoreTimestampToDate(serializedTiddler.modified),
  };
};

const dateToFirestoreTimestamp = (date: Date) => admin.firestore.Timestamp.fromDate(date);

const encode = (tiddler: Tiddler): FirestoreSerializedTiddler => {
  return {
    ...tiddler,
    created: dateToFirestoreTimestamp(tiddler.created),
    modified: dateToFirestoreTimestamp(tiddler.modified),
  };
};

@injectable()
export class FirestoreTransactionRunner implements TransactionRunner {
  private db: Database;
  private getTimestamp: () => Date;

  private makeFirestorePersistence(
    user: User,
    tx: Transaction
  ): StandardTiddlerPersistence {
    return new TransformingTiddlerPersistence(
      encode,
      decode,
      new FirestorePersistence(user, tx, this.db, this.getTimestamp)
    );
  }

  constructor(
    @inject(Component.FireStoreDB) db: Database,
    @inject(Component.getTimestamp) getTimestamp: typeof _getTimestamp
  ) {
    this.db = db;
    this.getTimestamp = getTimestamp;
  }

  async runTransaction<R>(
    user: User,
    updateFunction: (
      persistence: StandardTiddlerPersistence
    ) => Promise<R>
  ): Promise<R> {
    return await this.db.runTransaction(
      async (tx: Transaction) => {
        return updateFunction(
          this.makeFirestorePersistence(user, tx)
        );
      }
    );
  }
}
