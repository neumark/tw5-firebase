import * as admin from 'firebase-admin';

export type TiddlerFields = { [key: string]: string };

// from: https://stackoverflow.com/a/55032655
type Modify<T, R> = Omit<T, keyof R> & R;

// Standard internal representation
export interface Tiddler {
  created: Date;
  creator: string;
  modified: Date;
  modifier: string;
  revision?: string;
  tags?: string[];
  text?: string;
  title: string;
  type: string;
  fields?: TiddlerFields;
}

// Override Date fields as strings in serialized version
export type HTTPSerializedTiddler = Modify <Tiddler, {
  // Fields considered mandatory in Tiddler are optional over the wire:
  created?: string;
  modified?: string;
  creator?: string;
  modifier?: string;
  type?: string;
  bag?: string;
}>;

// Override Date fields as strings and remove bag field in DB serialized version
export type FirestoreSerializedTiddler = Modify <Tiddler, {
  created: admin.firestore.Timestamp;
  modified: admin.firestore.Timestamp;
}>;