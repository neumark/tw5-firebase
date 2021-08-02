import { TW5FirebaseError } from '@tw5-firebase/shared/src/model/errors';
import { Revision } from '@tw5-firebase/shared/src/model/revision';
import { SingleWikiNamespacedTiddler } from '@tw5-firebase/shared/src/api/bag-api';

export enum ChangeOrigin {
  remote = 'remote',
  local = 'local'
}

export enum ChangeType {
  create = 'create',
  update = 'update',
  delete = 'delete',
}

export interface TiddlerChangeBase {changeOrigin: ChangeOrigin};

export type TiddlerChange =
  | ({ changeType: ChangeType.create } & SingleWikiNamespacedTiddler & TiddlerChangeBase)
  | ({ changeType: ChangeType.update, parentRevision?:Revision } & SingleWikiNamespacedTiddler & TiddlerChangeBase)
  | ({ changeType: ChangeType.delete; bag: string; title: string } & TiddlerChangeBase);

export type ChangeResult = Omit<TiddlerChange, 'changeType'>;

export interface ChangeListener {
  onChange: (change: TiddlerChange) => void;
  onError?: (error: TW5FirebaseError) => void;
}