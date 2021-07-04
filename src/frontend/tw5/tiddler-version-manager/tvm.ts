import { Tiddler, TiddlerWithRevision } from '../../../shared/model/tiddler';
import { ChangeType, TiddlerChange, ChangeResult, ChangeListener, LocalTiddler, ChangeOrigin } from './types';
import { registerListener as _registerListener } from './remote-change-listener';
import { interactiveMerge as _interactiveMerge } from './interactive-merge';
import { PickRequired } from '../../../shared/util/useful-types';
import { Logger } from '../../../shared/util/logger';
import { FirebaseLogger } from '../../../backend/api/firebase-logger';
import { Wiki } from '../tw5-types';
import { TW5FirebaseError, TW5FirebaseErrorCode } from '../../../shared/model/errors';

export type ReferencedRevision = TiddlerWithRevision & { referencedBy: string };

export interface TiddlerState {
  // revisions referred to by draft tiddlers are stored in referencedRevisions
  referencedRevisions: ReferencedRevision[];
  lastKnownServerRevision: TiddlerWithRevision;
  writeQueue: TiddlerChange[];
  currentWriteOperation?: Promise<ChangeResult>;
}

type BagState = {
  tiddlerStates: Record<string, TiddlerState>;
  unregisterListener?: () => void;
};

/**
 * TiddlerVersionManager keeps track of the last known "official" version of each editable tidder.
 * Editable meaning tiddler stored in firestore, not compiled into the index.html file by `spabuilder`.
 *
 * Changes can arrive from:
 * * local edits ($tw.wiki "change" events caught and forwarded by the syncadaptor)
 * * firestore sdk listener C(R)UD events delivered via websocket.
 *
 * Both sources provide snapshots of the changed document. To merge multiple snapshots, the difference
 * must be computed between the snapshot and the base document it modified.
 *
 * # Conflict scenarios
 * A conflict occurs when a snapshot arrives which is based on a different version of the tiddler than what's currently
 * known to the TiddlerVersionManager. This can happen when:
 * 1. We save the draft tiddler of an original tiddler which has been updated by someone else while we were editing.
 * 2. Someone made changes to a tiddler which we have also edited locally.
 * 2. We save a newly created tiddler which was created by someone else as we were editing.
 * 3. We delete a tiddler already deleted by someone else.
 * 4. A draft of a tiddler is saved which has been deleted by someone else while it was being edited.
 *
 * # Tiddler States
 * 1. When the wiki loads, all editable tiddlers have a single version, from the server.
 * 2. When a tiddler is edited, a draft tiddler is created, which references the current version of the original tiddler.
 *
 *
 */
export class TiddlerVersionManager implements ChangeListener {
  private wikiName: string;
  private bagsInRecipe: string[];
  private registerListener: typeof _registerListener;
  private logger: Logger;
  private interactiveMerge: typeof _interactiveMerge;

  // recipeState: {bag name => bag state}
  private localTiddlers: Record<string, LocalTiddler> = {};
  private bagStates: Record<string, BagState> = {};

  private setupListeners() {
    for (const bag of this.bagsInRecipe) {
      this.bagStates[bag] = {
        tiddlerStates: {},
      };
      this.bagStates[bag].unregisterListener = this.registerListener({ wiki: this.wikiName, bag }, this);
    }
  }

  private saveServerRevision(bag: string, tiddler: Tiddler, revision: string) {
    this.bagStates[bag].tiddlerStates[tiddler.title] = {
      writeQueue: [],
      referencedRevisions: [],
      lastKnownServerRevision: {
        tiddler,
        revision,
      },
    };
  }

  private enqueueWrite(bag: string, title: string, change: TiddlerChange): Promise<ChangeResult> {
    // TODO!
    return Promise.resolve({} as ChangeResult);
  }

  constructor(
    {
      wikiName,
      bagsInRecipe,
      registerListener = _registerListener,
      logger = new FirebaseLogger(),
      interactiveMerge = _interactiveMerge,
    } = {} as PickRequired<
      {
        wikiName: string;
        bagsInRecipe: string[];
        wiki: Wiki;
        registerListener: typeof _registerListener;
        logger: Logger;
        interactiveMerge: typeof _interactiveMerge;
      },
      'wikiName' | 'bagsInRecipe'
    >,
  ) {
    this.wikiName = wikiName;
    this.bagsInRecipe = bagsInRecipe;
    this.registerListener = registerListener;
    this.logger = logger;
    this.interactiveMerge = interactiveMerge;
    this.setupListeners();
  }

  getLocalTiddler(title: string): LocalTiddler | undefined {
    return this.localTiddlers[title];
  }

  onError(error: TW5FirebaseError): void {
    // TODO
    this.logger.error(error.message, error);
  }

  onChange(change: TiddlerChange): void {
    switch (change.changeType) {
      case ChangeType.create: {
        // CONFLICT: local create when tiddler already exists (due to remotely issued create)
        if (change.changeOrigin === ChangeOrigin.local && this.getLocalTiddler(change.tiddler.title)) {
          // Local tiddler create is unlikely to result in conflict,
          // as the syncAdaptor checks whether the tiddler already exists (and issues an update if it does).
          // Still, theoretically a race condition is possible where the syncadaptor doesn't yet know about
          // the tiddler, issues a 'create' type change, but a remote change arrives for the given tiddler
          // in parallel to the processing of a local 'create' change.
          return this.onError(
            new TW5FirebaseError({
              code: TW5FirebaseErrorCode.CREATE_EXISTING_TIDDLER,
              data: { title: change.tiddler.title },
            }),
          );
        }
        // CONFLICT: remote create when tiddler already exists locally (due to local create).
        if (change.changeOrigin === ChangeOrigin.remote && this.getLocalTiddler(change.tiddler.title)) {
        }
        break;
      }
      case ChangeType.update: {
        break;
      }
      case ChangeType.delete: {
        break;
      }
      default:
        const { changeType } = change;
        assertUnreachable(changeType);
    }
  }
}
