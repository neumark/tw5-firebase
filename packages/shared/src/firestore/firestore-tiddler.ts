import { Tiddler, TiddlerNamespace } from '../model/tiddler';
import { Modify } from '../util/useful-types';
import { Revision } from '../model/revision';
import firebase from 'firebase';
import { replaceUrlEncoded } from '../util/templates';

export type FirestoreSerializedTiddler = Omit<
  Modify<
    Tiddler,
    {
      // convert timestamps to firestore-native timestamp type
      created: firebase.firestore.Timestamp;
      modified: firebase.firestore.Timestamp;
      // add the revision field
      revision: string;
      text: any; // JSON tiddlers can have any type in text
    }
  >,
  'title'
>;

export type FirestoreToJSTimestamp = (ts: firebase.firestore.Timestamp) => Date;
export type JSToFirestoreTimestamp = (ts: Date) => firebase.firestore.Timestamp;

export const toStandardTiddler = (
  docId: string,
  serializedTiddler: FirestoreSerializedTiddler,
  timestampConverter: FirestoreToJSTimestamp,
): Tiddler => {
  const { created, modified, revision, text, type, ...rest } = serializedTiddler;
  return {
    ...rest,
    type,
    text,
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
    text,
    created: timestampConverter(created),
    modified: timestampConverter(modified),
    revision,
  };
};

export enum PATH_TEMPLATE {
  BAG = 'wikis/:wiki/bags/:bag/tiddlers',
  TIDDLER = 'wikis/:wiki/bags/:bag/tiddlers/:title'
}

export const makeKey = (ns: TiddlerNamespace, title?: string) => title ? replaceUrlEncoded(PATH_TEMPLATE.TIDDLER, {title, ...ns}) : replaceUrlEncoded(PATH_TEMPLATE.BAG, {...ns})