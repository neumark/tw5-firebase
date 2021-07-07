import { TW5FirebaseError } from '../../../../shared/src/model/errors';
import { Revision } from '../../../../shared/src/model/revision';
import { SingleWikiNamespacedTiddler } from '../../../../shared/src/model/store';
import { TiddlerWithRevision } from '../../../../shared/src/model/tiddler';

export enum ChangeOrigin {
  remote = 'remote',
  local = 'local'
}

export enum ChangeType {
  create = 'create',
  update = 'update',
  delete = 'delete',
}

/**
 * Stores information required by the SyncAdaptor to be stored for each tiddler
 */
export interface LocalTiddler extends TiddlerWithRevision {
  bag:string;
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