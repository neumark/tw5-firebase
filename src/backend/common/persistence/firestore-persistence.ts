import * as admin from "firebase-admin";
import { inject, injectable } from "inversify";
import { Revision, Tiddler, TiddlerNamespace } from "../../../model/tiddler";
import { Modify } from "../../../util/modify";
import { HTTPError, HTTP_CONFLICT } from "../../api/errors";
import { Component } from "../ioc/components";
import {
  MaybePromise,
  Persistence,
  StandardTiddlerPersistence,
  TransactionRunner,
} from "./interfaces";
import { TransformingTiddlerPersistence } from "./transforming-persistence";

// Override Date fields as strings and remove bag field in DB serialized version
export type FirestoreSerializedTiddler = Modify<
  Tiddler,
  {
    // convert timestamps to firestore-native timestamp type
    created: admin.firestore.Timestamp;
    modified: admin.firestore.Timestamp;
    // make the revision field mandatory
    revision: string;
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
  implements Persistence<string, Revision, FirestoreSerializedTiddler, TiddlerNamespace> {
  private tx: FirebaseFirestore.Transaction;
  private db: FirebaseFirestore.Firestore;

  constructor(
    tx: FirebaseFirestore.Transaction,
    db: FirebaseFirestore.Firestore
  ) {
    this.tx = tx;
    this.db = db;
  }
  async readDocs(
    documentKeys: { namespace: TiddlerNamespace; key: string }[]
  ): Promise<
    {
      namespace: TiddlerNamespace;
      key: string;
      value: FirestoreSerializedTiddler;
      revision: Revision
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
          return { revision: value.revision, value, ...documentKeys[ix] };
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
      revision: Revision
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
        return { namespace, key: value.title, value, revision: value.revision};
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
  ): Promise<{value: FirestoreSerializedTiddler, revision:Revision}|undefined> {
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
      return {value: updatedDoc, revision: updatedDoc.revision};
    } else {
      this.tx.delete(this.db.doc(makeKey(namespace, key)));
    }
    return updatedDoc;
  }
}

export const firestoreTimestampToDate = (ts: admin.firestore.Timestamp): Date =>
  ts.toDate();

const decode = (serializedTiddler: FirestoreSerializedTiddler): Tiddler => {
  return {
    ...serializedTiddler,
    created: firestoreTimestampToDate(serializedTiddler.created),
    modified: firestoreTimestampToDate(serializedTiddler.modified),
  };
};

const dateToFirestoreTimestamp = (date: Date) =>
  admin.firestore.Timestamp.fromDate(date);

const encode = (tiddler: Tiddler): FirestoreSerializedTiddler => {
  return {
    ...tiddler,
    revision: tiddler.revision!,
    created: dateToFirestoreTimestamp(tiddler.created),
    modified: dateToFirestoreTimestamp(tiddler.modified),
  };
};

const overrideCreationFieldsPostUpdater = (
  pre?: Tiddler,
  post?: Tiddler
): Tiddler | undefined => {
  // if tiddler deleted or newly created, just return post
  if (!post || !pre) {
    return post;
  }
  // tiddler not deleted, a pre-existing version is available
  return {
    ...post,
    created: pre.created,
    creator: pre.creator,
  };
};

export const makeFirestorePersistence = (
  ...args: ConstructorParameters<typeof FirestorePersistence>
): StandardTiddlerPersistence => {
  return new TransformingTiddlerPersistence(
    encode,
    decode,
    new FirestorePersistence(...args),
    overrideCreationFieldsPostUpdater
  );
};

@injectable()
export class FirestoreTransactionRunner implements TransactionRunner {
  private db: FirebaseFirestore.Firestore;

  constructor(@inject(Component.FireStoreDB) db: FirebaseFirestore.Firestore) {
    this.db = db;
  }
  async runTransaction<R>(
    updateFunction: (persistence: StandardTiddlerPersistence) => Promise<R>
  ): Promise<R> {
    return await this.db.runTransaction(
      async (tx: FirebaseFirestore.Transaction) => {
        return updateFunction(makeFirestorePersistence(tx, this.db));
      }
    );
  }
}
