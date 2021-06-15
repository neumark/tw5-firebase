import {
  MaybePromise,
  NamespacedTiddler,
  TiddlerPersistence,
  TransactionRunner,
} from "../../../src/backend/common/persistence/interfaces";
import { TiddlerNamespace, Tiddler } from "../../../src/shared/model/tiddler";
import { Revision } from "../../../src/shared/model/revision";
import { TW5FirebaseError, TW5FirebaseErrorCode} from "../../../src/shared/model/errors";

interface TiddlerWithRevision {
  tiddler: Tiddler;
  revision: Revision;
}

export class MapPersistance implements TiddlerPersistence, TransactionRunner {
  state = new Map<string, TiddlerWithRevision>();

  private makeKey(namespace: TiddlerNamespace, title?: string) {
    return `${namespace.wiki}:${namespace.bag}/${title ? title : ""}`;
  }

  private parseNamespace(mapKey: string): TiddlerNamespace {
    const parts = mapKey.split(":")[0];
    return {
      wiki: parts[0],
      bag: parts[1].split("/")[0],
    };
  }

  async readBags(
    collections: TiddlerNamespace[]
  ): Promise<
    NamespacedTiddler[]
  > {
    const prefixSet = new Set(collections.map((c) => this.makeKey(c)));
    return [...this.state.entries()]
        .filter(([key, _val]) => prefixSet.has(key.split("/")[0]))
        .map(([key, val]) => ({
          namespace: this.parseNamespace(key),
          ...val,
        }))
  }

  async readTiddlers(
    requestedTiddlers: { namespace: TiddlerNamespace; title: string }[]
  ): Promise<
    NamespacedTiddler[]
  > {
    return requestedTiddlers
        .map(({ namespace, title }) => {
          const key = this.makeKey(namespace, title);
          if (this.state.has(key)) {
            return {
              namespace,
              ...this.state.get(key),
            } as NamespacedTiddler;
          }
        })
        .filter((x) => x !== undefined) as NamespacedTiddler[]
  }

  async removeTiddler(
    namespace: TiddlerNamespace,
    title: string,
    expectedRevision?: string
  ): Promise<{ existed: boolean }> {
    const entry:TiddlerWithRevision|undefined = this.state.get(this.makeKey(namespace, title));
    if (entry) {
      if (entry.revision !== expectedRevision) {
        throw new TW5FirebaseError("revision error", TW5FirebaseErrorCode.REVISION_CONFLICT, {expectedRevision, revision: entry.revision});
      }
      this.state.delete(this.makeKey(namespace, title))
      return {existed: true};
    }
    return {existed: false};
  }

  async createTiddler(
    namespace: TiddlerNamespace,
    tiddler: Tiddler,
    revision: string
  ): Promise<void> {
    const key = this.makeKey(namespace, tiddler.title);
    const entry:TiddlerWithRevision|undefined = this.state.get(key);
    if (entry) {
      throw new TW5FirebaseError("tiddler already exists", TW5FirebaseErrorCode.CREATE_EXISTING_TIDDLER);
    }
    this.state.set(key, {tiddler, revision});
  }

  async updateTiddler(
    namespace: TiddlerNamespace,
    title: string,
    updater: (
      oldTiddler: Tiddler
    ) => MaybePromise<{ tiddler: Tiddler; revision: string }>,
    expectedRevision?: string
  ): Promise<{ tiddler: Tiddler; revision: Revision }> {
    const key = this.makeKey(namespace, title);
    const entry:TiddlerWithRevision|undefined = this.state.get(key);
    if (!entry) {
      throw new TW5FirebaseError("tiddler does not exists", TW5FirebaseErrorCode.UPDATE_MISSING_TIDDLER);
    }
    if (expectedRevision !== entry.revision) {
      throw new TW5FirebaseError("revision mismatch", TW5FirebaseErrorCode.REVISION_CONFLICT);
    }
    const newEntry = await updater(entry.tiddler);
    this.state.set(key, newEntry);
    return newEntry;
  }

  runTransaction<R>(
    updateFunction: (persistence: TiddlerPersistence) => Promise<R>
  ): Promise<R> {
    return updateFunction(this);
  }
}
