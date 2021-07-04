import { Tiddler, TiddlerNamespace } from '../model/tiddler';
import { Modify } from '../util/useful-types';
import type { firestore } from 'firebase-admin';
import { Revision } from '../model/revision';
import { JSON_TIDDLER_TYPE } from '../../constants';

export type FirestoreSerializedTiddler = Omit<
  Modify<
    Tiddler,
    {
      // convert timestamps to firestore-native timestamp type
      created: firestore.Timestamp;
      modified: firestore.Timestamp;
      // add the revision field
      revision: string;
      text: any; // JSON tiddlers can have any type in text
    }
  >,
  'title'
>;

export type FirestoreToJSTimestamp = (ts: firestore.Timestamp) => Date;
export type JSToFirestoreTimestamp = (ts: Date) => firestore.Timestamp;

export const toStandardTiddler = (
  docId: string,
  serializedTiddler: FirestoreSerializedTiddler,
  timestampConverter: FirestoreToJSTimestamp,
): Tiddler => {
  const { created, modified, revision, text, type, ...rest } = serializedTiddler;
  return {
    ...rest,
    type,
    text: type === JSON_TIDDLER_TYPE ? JSON.stringify(text) : (text as string),
    title: decodeURIComponent(docId),
    created: timestampConverter(created),
    modified: timestampConverter(modified),
  };
};

export const toFirestoreTiddler = (
  tiddler: Tiddler,
  revision: Revision,
  timestampConverter: JSToFirestoreTimestamp,
): FirestoreSerializedTiddler => {
  const { created, modified, title, text, type, ...rest } = tiddler;
  return {
    ...rest,
    type,
    text: text && type === JSON_TIDDLER_TYPE ? JSON.parse(text) : text,
    created: timestampConverter(created),
    modified: timestampConverter(modified),
    revision,
  };
};

export const makeKey = (ns: TiddlerNamespace, title?: string) => {
  const collectionPath = `wikis/${encodeURIComponent(ns.wiki)}/bags/${encodeURIComponent(ns.bag)}/tiddlers`;
  if (title) {
    return `${collectionPath}/${encodeURIComponent(title)}`;
  }
  return collectionPath;
};
