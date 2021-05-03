import * as admin from "firebase-admin";
import { inject, injectable } from "inversify";
import { getRevision, Revision } from "../../../shared/model/revision";
import { Tiddler, TiddlerNamespace } from "../../../shared/model/tiddler";
import { User } from "../../../shared/model/user";
import { Modify } from "../../../shared/util/useful-types";
import { getTimestamp as _getTimestamp } from "../../../shared/util/time";
import { HTTPError, HTTP_CONFLICT } from "../../api/errors";
import { Component } from "../ioc/components";
import {
  MaybePromise,
  TiddlerPersistence,
  TransactionRunner,
} from "./interfaces";

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
  const bag = `wikis/${encodeURIComponent(ns.wiki)}/bags/${encodeURIComponent(
    ns.bag
  )}/tiddlers`;
  if (title) {
    return `${bag}/${encodeURIComponent(title)}`;
  }
  return bag;
};

const firestoreTimestampToDate = (ts: Timestamp): Date => ts.toDate();
const dateToFirestoreTimestamp = (date: Date) =>  admin.firestore.Timestamp.fromDate(date);

export class FirestorePersistence implements TiddlerPersistence {
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

  async readDocs(
    documentKeys: { namespace: TiddlerNamespace; title: string }[]
  ): Promise<
    {
      namespace: TiddlerNamespace;
      title: string;
      value: Tiddler;
      revision: Revision;
    }[]
  > {
    const refs = documentKeys.map((docKey) =>
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
            value: this.toStandardTiddler(doc.id, firestoreTiddler),
            ...documentKeys[ix],
          };
        })
    );
  }
  async readCollections(
    namespaces: TiddlerNamespace[]
  ): Promise<
    {
      namespace: TiddlerNamespace;
      title: string;
      value: Tiddler;
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
        const value = this.toStandardTiddler(doc.id, firestoreTiddler);
        return {
          namespace,
          title: value.title,
          value,
          revision: firestoreTiddler.revision,
        };
      })
    );
    return allDocs.flat();
  }

  async updateDoc(
    namespace: TiddlerNamespace,
    title: string,
    updater: (value?: Tiddler) => MaybePromise<Tiddler | undefined>,
    expectedRevision?: Revision
  ): Promise<
    | {
        namespace: TiddlerNamespace;
        title: string;
        value: Tiddler;
        revision: Revision;
      }
    | undefined
  > {
    const [doc] = await this.readDocs([{ namespace, title }]);
    if (doc && doc.revision !== expectedRevision) {
      throw new HTTPError(
        `revision conflict: Tiddler ${JSON.stringify({
          title,
          ...namespace,
        })} has revision ${
          doc.revision
        }, attempted update expected revision ${expectedRevision}`,
        HTTP_CONFLICT
      );
    }
    const updatedTiddler = await Promise.resolve(updater(doc ? doc.value : undefined));
    if (updatedTiddler) {
      // set new revision
      const revision = getRevision(this.user, this.getTimestamp());
      this.tx.set(
        this.db.doc(makeKey(namespace, title)),
        this.toFirestoreTiddler(updatedTiddler, revision)
      );
      return {
        namespace,
        title,
        value: updatedTiddler,
        revision,
      };
    } else {
      this.tx.delete(this.db.doc(makeKey(namespace, title)));
    }
    return updatedTiddler;
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
    user: User,
    updateFunction: (persistence: TiddlerPersistence) => Promise<R>
  ): Promise<R> {
    return await this.db.runTransaction(async (tx: Transaction) => {
      return updateFunction(
        new FirestorePersistence(user, tx, this.db, this.getTimestamp)
      );
    });
  }
}
