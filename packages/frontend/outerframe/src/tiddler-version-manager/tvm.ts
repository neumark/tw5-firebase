import { TiddlerWithRevision } from '@tw5-firebase/shared/src/model/tiddler';
import { ChangeType, TiddlerChange, ChangeResult, ChangeListener } from './types';
import { registerListener as _registerListener } from './remote-change-listener';
import { Logger } from '@tw5-firebase/shared/src/util/logger';
import { TW5FirebaseError } from '@tw5-firebase/shared/src/model/errors';
import { assertUnreachable } from '@tw5-firebase/shared/src/util/switch';
import { SingleWikiNamespacedTiddler } from '@tw5-firebase/shared/src/api/bag-api';

export interface TiddlerState {
  lastKnownRemoteRevision: TiddlerWithRevision;
  currentWriteOperation?: Promise<ChangeResult>;
}

type BagState = {
  tiddlerStates: Record<string, TiddlerState>;
  lastTiddlerRead: boolean;
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
  private wiki: string;
  private bags: string[];
  private registerListener: typeof _registerListener;
  private logger: Logger;


  private bagStates: Record<string, BagState> = {};


  /*
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

  */

  constructor(
    wiki:string,
    bags:string[],
    {
      registerListener = _registerListener,
      logger = globalThis.console,
    } = {} as Partial<
      {
        registerListener: typeof _registerListener;
        logger: Logger;
      }
    >,
  ) {
    this.wiki = wiki;
    this.bags = bags;
    this.registerListener = registerListener;
    this.logger = logger;
  }

  setupListeners() {
    for (const bag of this.bags) {
      this.bagStates[bag] = {
        lastTiddlerRead: false,
        tiddlerStates: {},
      };
      this.bagStates[bag].unregisterListener = this.registerListener({ wiki: this.wiki, bag }, this);
    }
  }

  getAllTiddlers(): SingleWikiNamespacedTiddler[] {
    const result:Record<string, SingleWikiNamespacedTiddler> = {};
    for (let bag of this.bags.reverse()) {
      Object.entries(this.bagStates[bag].tiddlerStates).reduce((acc, [title, tiddlerState]) => {
        if (!(title in acc)) {
          acc[title] = {...tiddlerState.lastKnownRemoteRevision, bag};
        }
        return acc;
      }, result)
    }
    return Object.values(result);
  }

  onError(error: TW5FirebaseError): void {
    // TODO
    this.logger.error(error.message, error);
  }

  onChange(change: TiddlerChange): void {
    switch (change.changeType) {
      case ChangeType.create: {
        // if a tiddler has been created remotely, update the last known remote revision
        if (change.changeOrigin === 'remote') {
          // TODO: what if there's an in-progress write?
          this.bagStates[change.bag].tiddlerStates[change.tiddler.title] = this.bagStates[change.bag].tiddlerStates[change.tiddler.title] ?? {};
          this.bagStates[change.bag].tiddlerStates[change.tiddler.title].lastKnownRemoteRevision = {
            tiddler: change.tiddler,
            revision: change.revision
          }
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
        assertUnreachable(change);
    }
  }
}
