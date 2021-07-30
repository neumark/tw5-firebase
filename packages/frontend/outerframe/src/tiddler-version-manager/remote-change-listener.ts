import firebase from 'firebase';
import { FirestoreSerializedTiddler, makeKey, toStandardTiddler } from '../../../../shared/src/firestore/firestore-tiddler';
import { TW5FirebaseError, TW5FirebaseErrorCode } from '../../../../shared/src/model/errors';
import { TiddlerNamespace } from '../../../../shared/src/model/tiddler';
import { ChangeListener, ChangeOrigin, ChangeType, TiddlerChange } from './types';
import {assertUnreachable} from '@tw5-firebase/shared/src/util/switch'

const firestoreTimestampToDate = (ts: firebase.firestore.Timestamp): Date => ts.toDate();

const changeOrigin = ChangeOrigin.remote;

const toTiddlerChange = (
  bag: string,
  firestoreChange: firebase.firestore.DocumentChange<firebase.firestore.DocumentData>,
): TiddlerChange => {
  switch (firestoreChange.type) {
    case 'added':
      return {
        changeOrigin,
        changeType: ChangeType.create,
        bag,
        tiddler: toStandardTiddler(
          firestoreChange.doc.id,
          firestoreChange.doc.data() as FirestoreSerializedTiddler,
          firestoreTimestampToDate,
        ),
        revision: (firestoreChange.doc.data() as FirestoreSerializedTiddler).revision,
      };
    case 'modified':
      return {
        changeOrigin,
        changeType: ChangeType.update,
        bag,
        tiddler: toStandardTiddler(
          firestoreChange.doc.id,
          firestoreChange.doc.data() as FirestoreSerializedTiddler,
          firestoreTimestampToDate,
        ),
        revision: (firestoreChange.doc.data() as FirestoreSerializedTiddler).revision,
      };
    case 'removed':
      return {
        changeOrigin,
        changeType: ChangeType.delete,
        bag,
        title: decodeURIComponent(firestoreChange.doc.id),
      };
    default:
      return assertUnreachable(firestoreChange.type);
  }
};


export const registerListener = (ns: TiddlerNamespace, listener: ChangeListener): (() => void) =>
  firebase
    .firestore()
    .collection(makeKey(ns))
    .onSnapshot({
      next: (snapshot: firebase.firestore.QuerySnapshot<firebase.firestore.DocumentData>): void => {
        for (const change of snapshot.docChanges()) {
          listener.onChange(toTiddlerChange(ns.bag, change));
        }
      },
      error: (err: firebase.firestore.FirestoreError): void => {
        console.error(err);
        if (listener.onError) {
          listener.onError(
            new TW5FirebaseError({
              code: TW5FirebaseErrorCode.FIRESTORE_LISTENER_ERROR,
              data: JSON.stringify(err),
            }),
          );
        } else {
          // TODO: firestore listener error, panic!
          globalThis.console.error(`PANIC: ${err}`);
        }
      },
    });
