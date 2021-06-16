import * as admin from "firebase-admin";
import { inject, injectable } from "inversify";
import { Revision } from "../../../shared/model/revision";
import { Tiddler, TiddlerNamespace } from "../../../shared/model/tiddler";
import { Modify } from "../../../shared/util/useful-types";
import { getTimestamp as _getTimestamp } from "../../../shared/util/time";
import { Component } from "../ioc/components";
import {
  MaybePromise,
  TiddlerPersistence,
  TransactionRunner,
} from "./interfaces";
import { TW5FirebaseError, TW5FirebaseErrorCode } from "../../../shared/model/errors";

type Transaction = admin.firestore.Transaction;
type Database = admin.firestore.Firestore;
type Timestamp = admin.firestore.Timestamp;

export type FirestoreSerializedTiddler = Omit<
  Modify<
    Tiddler,
    {
      // convert timestamps to firestore-native timestamp type
      created: Timestamp;
      modified: Timestamp;
      // add the revision field
      revision: string;
    }
  >,
  "title"
>;

const asyncMap = async <T, R = any>(list: T[], fn: (e: T) => Promise<R>) =>
  await Promise.all(list.map(fn));

const makeKey = (ns: TiddlerNamespace, title?: string) => {
  const collectionPath = `wikis/${encodeURIComponent(
    ns.wiki
  )}/bags/${encodeURIComponent(ns.bag)}/tiddlers`;
  if (title) {
    return `${collectionPath}/${encodeURIComponent(title)}`;
  }
  return collectionPath;
};

const firestoreTimestampToDate = (ts: Timestamp): Date => ts.toDate();
const dateToFirestoreTimestamp = (date: Date) =>
  admin.firestore.Timestamp.fromDate(date);

export class FirestorePersistence implements TiddlerPersistence {
  private tx: Transaction;
  private db: Database;

  constructor(tx: Transaction, db: Database) {
    this.tx = tx;
    this.db = db;
  }

  toStandardTiddler(
    docId: string,
    serializedTiddler: FirestoreSerializedTiddler
  ): Tiddler {
    const { created, modified, revision, ...rest } = serializedTiddler;
    return {
      ...rest,
      title: decodeURIComponent(docId),
      created: firestoreTimestampToDate(created),
      modified: firestoreTimestampToDate(modified),
    };
  }

  toFirestoreTiddler(
    tiddler: Tiddler,
    revision: Revision
  ): FirestoreSerializedTiddler {
    const { created, modified, title, ...rest } = tiddler;
    return {
      ...rest,
      created: dateToFirestoreTimestamp(created),
      modified: dateToFirestoreTimestamp(modified),
      revision,
    };
  }

  async revisionCheck (namespace: TiddlerNamespace, title: string, expectedRevision?:Revision):Promise<{
    namespace: TiddlerNamespace;
    tiddler: Tiddler;
    revision: Revision;
  }|undefined> {
    const [doc] = await this.readTiddlers([{ namespace, title }]);
  if (!doc) {
    return undefined;
  }
  if (expectedRevision && (doc.revision !== expectedRevision)) {
    throw new TW5FirebaseError({
      code: TW5FirebaseErrorCode.REVISION_CONFLICT,
      data: {
        updateExpected: expectedRevision,
        foundInDatabase: doc.revision
      }
    });
  }
  return doc;
  }

  async readTiddlers(
    namespacedTitles: { namespace: TiddlerNamespace; title: string }[]
  ): Promise<
    {
      namespace: TiddlerNamespace;
      tiddler: Tiddler;
      revision: Revision;
    }[]
  > {
    const refs = namespacedTitles.map((docKey) =>
      this.db.doc(makeKey(docKey.namespace, docKey.title))
    );
    return (
      (await this.tx.getAll(...refs))
        // associate each doc with it's index
        .map((doc, ix) => ({ doc, ix }))
        // filter out docs which don't exist in firestore
        .filter(({ doc }) => doc.exists)
        // return in format of interface
        .map(({ doc, ix }) => {
          const firestoreTiddler = doc.data() as FirestoreSerializedTiddler;
          return {
            revision: firestoreTiddler.revision,
            tiddler: this.toStandardTiddler(doc.id, firestoreTiddler),
            namespace: namespacedTitles[ix].namespace,
          };
        })
    );
  }

  async readBags(
    namespaces: TiddlerNamespace[]
  ): Promise<
    {
      namespace: TiddlerNamespace;
      tiddler: Tiddler;
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
        const firestoreTiddler = doc.data() as FirestoreSerializedTiddler;
        const tiddler = this.toStandardTiddler(doc.id, firestoreTiddler);
        return {
          namespace,
          tiddler,
          revision: firestoreTiddler.revision,
        };
      })
    );
    return allDocs.flat();
  }

  async updateTiddler(
    namespace: TiddlerNamespace,
    title: string,
    updater: (
      oldTiddler: Tiddler
    ) => MaybePromise<{
      tiddler: Tiddler /* new tiddler */;
      revision: Revision /* new revision */;
    }>,
    expectedRevision?: Revision
  ): Promise<{ tiddler: Tiddler; revision: Revision }> {
    const doc = await this.revisionCheck(namespace, title, expectedRevision);
    if (!doc) {
      throw new TW5FirebaseError(
        {code: TW5FirebaseErrorCode.UPDATE_MISSING_TIDDLER,
          data: {
            bag: namespace.bag,
            title
          }
        });
    }
    const { tiddler, revision } = await Promise.resolve(updater(doc.tiddler));
    this.tx.set(
      this.db.doc(makeKey(namespace, title)),
      this.toFirestoreTiddler(tiddler, revision)
    );
    return { tiddler, revision };
  }

  async removeTiddler (namespace: TiddlerNamespace, title: string, expectedRevision?: string) : Promise<{ existed: boolean; }> {
    const doc = this.revisionCheck(namespace, title, expectedRevision);
    if (!doc) {
      return {existed: false};
    }
    this.tx.delete(this.db.doc(makeKey(namespace, title)));
    return {existed: true};
  }
  async createTiddler (namespace: TiddlerNamespace, tiddler: Tiddler, revision:Revision) : Promise<void> {
    if ((await this.readTiddlers([{ namespace, title: tiddler.title }])).length > 0) {
      throw new TW5FirebaseError(
        {code: TW5FirebaseErrorCode.CREATE_EXISTING_TIDDLER,
        data: {
          title: tiddler.title
        }}
      );
    }
    this.tx.set(
      this.db.doc(makeKey(namespace, tiddler.title)),
      this.toFirestoreTiddler(tiddler, revision)
    );
    return;
  }
}

@injectable()
export class FirestoreTransactionRunner implements TransactionRunner {
  private db: Database;
  private getTimestamp: () => Date;

  constructor(
    @inject(Component.FireStoreDB) db: Database,
    @inject(Component.getTimestamp) getTimestamp: typeof _getTimestamp
  ) {
    this.db = db;
    this.getTimestamp = getTimestamp;
  }

  async runTransaction<R>(
    updateFunction: (persistence: TiddlerPersistence) => Promise<R>
  ): Promise<R> {
    return await this.db.runTransaction(async (tx: Transaction) => {
      return updateFunction(new FirestorePersistence(tx, this.db));
    });
  }
}
