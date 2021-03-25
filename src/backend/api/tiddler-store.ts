import { inject, injectable } from "inversify";
import { Tiddler, TiddlerData, TiddlerNamespace } from "../../shared/model/tiddler";
import { NamespacedRecipe } from "../../shared/model/recipe";
import { getRevision, Revision } from "../../shared/model/revision";
import { User } from "../../shared/model/user";
import { Component } from "../common/ioc/components";
import {
  MaybePromise,
  StandardTiddlerPersistence,
  TransactionRunner,
} from "../common/persistence/interfaces";
import { HTTPError, HTTP_FORBIDDEN, HTTP_NOT_FOUND } from "./errors";
import { PolicyChecker } from "./policy-checker";
import { RecipeResolver } from "./recipe-resolver";
import { getTimestamp as _getTimestamp } from "../../shared/util/time";
import { TiddlerFactory } from "../common/tiddler-factory";

export type NamespacedTiddler = {
  namespace: TiddlerNamespace;
  key: string;
  value: Tiddler;
  revision: Revision;
};
type TiddlerUpdateOrCreate =
  | { create: Partial<TiddlerData> }
  | { update: Partial<TiddlerData>; expectedRevision: Revision };

const getTiddlerData = (updateOrCreate:TiddlerUpdateOrCreate):Partial<TiddlerData> => 'create' in updateOrCreate ? updateOrCreate.create : updateOrCreate.update;
const getExpectedRevision = (updateOrCreate:TiddlerUpdateOrCreate):Revision|undefined => 'update' in updateOrCreate ? updateOrCreate.expectedRevision : undefined;

@injectable()
export class TiddlerStore {
  private transactionRunner: TransactionRunner;
  private policyChecker: PolicyChecker;
  private recipeResolver: RecipeResolver;
  private getTimestamp: typeof _getTimestamp;
  private tiddlerFactory: TiddlerFactory;

  private deduplicate(
    tiddlers: {
      namespace: TiddlerNamespace;
      key: string;
      value: Tiddler;
      revision: string;
    }[]
  ): {
    namespace: TiddlerNamespace;
    key: string;
    value: Tiddler;
    revision: string;
  }[] {
    const encounteredKeys = new Set<string>();
    const deduplicated: {
      namespace: TiddlerNamespace;
      key: string;
      value: Tiddler;
      revision: string;
    }[] = [];
    for (let tiddler of tiddlers) {
      if (encounteredKeys.has(tiddler.key)) {
        continue;
      }
      deduplicated.push(tiddler);
    }
    return deduplicated;
  }

  private getFirst(
    tiddlers: {
      namespace: TiddlerNamespace;
      key: string;
      value: Tiddler;
      revision: string;
    }[],
    key: string
  ):
    | {
        namespace: TiddlerNamespace;
        key: string;
        value: Tiddler;
        revision: string;
      }
    | undefined {
    return tiddlers.find((t) => t.key === key);
  }

  private getUpdater(
    user: User,
    key: string,
    updateOrCreate: TiddlerUpdateOrCreate
  ) {
    return (existingTiddler?: Tiddler): Tiddler => {
      if ("create" in updateOrCreate) {
        // create
        const newTiddler = this.tiddlerFactory.createTiddler(
          user,
          key,
          updateOrCreate.create.type
        );
        return Object.assign(newTiddler, updateOrCreate.create);
      }
      return Object.assign({}, existingTiddler, updateOrCreate.update);
    };
  }

  constructor(
    @inject(Component.TransactionRunner) transactionRunner: TransactionRunner,
    @inject(Component.PolicyChecker) policyChecker: PolicyChecker,
    @inject(Component.RecipeResolver) recipeResolver: RecipeResolver,
    @inject(Component.getTimestamp) getTimestamp: typeof _getTimestamp,
    @inject(Component.TiddlerFactory) tiddlerFactory: TiddlerFactory
  ) {
    this.transactionRunner = transactionRunner;
    this.policyChecker = policyChecker;
    this.recipeResolver = recipeResolver;
    this.getTimestamp = getTimestamp;
    this.tiddlerFactory = tiddlerFactory;
  }

  async readFromBag(
    user: User,
    namespace: TiddlerNamespace,
    key?: string
  ): Promise<NamespacedTiddler | Array<NamespacedTiddler>> {
    return this.transactionRunner.runTransaction(
      user,
      async (persistence: StandardTiddlerPersistence) => {
        const readPermission = await this.policyChecker.verifyReadAccess(
          persistence,
          user,
          namespace.wiki,
          [namespace.bag]
        );
        if (readPermission[0].allowed) {
          const tiddlers = await (key
            ? persistence.readDocs([{ namespace, key }])
            : persistence.readCollections([namespace]));
          if (key) {
            // unpack array if specific tiddler requested
            if (tiddlers.length < 1) {
              throw new HTTPError(
                `Tiddler ${key} not found in wiki ${namespace.wiki} bag ${namespace.bag}`,
                HTTP_NOT_FOUND
              );
            }
            return tiddlers[0];
          }
          return tiddlers;
        }
        throw new HTTPError(
          `Tiddler read denied ${readPermission[0].reason || ""}`,
          HTTP_FORBIDDEN
        );
      }
    );
  }

  async readFromRecipe(
    user: User,
    namespacedRecipe: NamespacedRecipe,
    key?: string
  ): Promise<NamespacedTiddler | Array<NamespacedTiddler>> {
    return this.transactionRunner.runTransaction(
      user,
      async (persistence: StandardTiddlerPersistence) => {
        const bags = await this.recipeResolver.getRecipeBags(
          user,
          "read",
          persistence,
          namespacedRecipe
        );
        if (!bags) {
          throw new HTTPError(
            `Recipe ${namespacedRecipe.recipe} not found in wiki ${namespacedRecipe.wiki}`,
            HTTP_NOT_FOUND
          );
        }
        const readPermissions = await this.policyChecker.verifyReadAccess(
          persistence,
          user,
          namespacedRecipe.wiki,
          bags,
        );
        if (!readPermissions.every((p) => p.allowed)) {
          // In the future, we may want to ignore some bags not being readable, and just serve tiddlers from those accessible.
          throw new HTTPError(
            `At least one bag referenced by recipe ${
              namespacedRecipe.recipe
            } in wiki ${
              namespacedRecipe.wiki
            } is not readable. Errors: ${readPermissions
              .map((p) => p.reason)
              .filter((x) => x)
              .join(", ")}`,
            HTTP_NOT_FOUND
          );
        }
        const tiddlers = await persistence.readCollections(
          bags.map((bag) => ({ wiki: namespacedRecipe.wiki, bag }))
        );
        if (key) {
          const tiddler = this.getFirst(tiddlers, key);
          if (!tiddler) {
            throw new HTTPError(
              `Tiddler ${key} not found in wiki ${namespacedRecipe.wiki} recipe ${namespacedRecipe.recipe}`,
              HTTP_NOT_FOUND
            );
          }
          return tiddler;
        } else {
          return this.deduplicate(tiddlers);
        }
      }
    );
  }

  async writeToBag(
    user: User,
    namespace: TiddlerNamespace,
    key: string,
    updateOrCreate: TiddlerUpdateOrCreate
  ): Promise<{
    namespace: TiddlerNamespace;
    key: string;
    value: Tiddler;
    revision: string;
  }> {
    const txResult = await this.transactionRunner.runTransaction(
      user,
      async (persistence: StandardTiddlerPersistence) => {
        const writePermission = await this.policyChecker.getWriteableBag(
          persistence,
          user,
          namespace.wiki,
          [namespace.bag],
          key,
          getTiddlerData(updateOrCreate)
        );
        if (writePermission[0].allowed) {
          return persistence.updateDoc(
            namespace,
            key,
            this.getUpdater(user, key, updateOrCreate),
            getExpectedRevision(updateOrCreate)
          );
        }
        throw new HTTPError(
          `Tiddler write denied ${writePermission[0].reason || ""}`,
          HTTP_FORBIDDEN
        );
      }
    );
    if (!txResult) {
      throw new Error("Result of write transaction should not be null");
    }
    return txResult;
  }

  async writeToRecipe(
    user: User,
    namespacedRecipe: NamespacedRecipe,
    key: string,
    updateOrCreate: TiddlerUpdateOrCreate
  ): Promise<{
    namespace: TiddlerNamespace;
    key: string;
    value: Tiddler;
    revision: string;
  }> {
    const txResult = await this.transactionRunner.runTransaction(
      user,
      async (persistence: StandardTiddlerPersistence) => {
        const bags = await this.recipeResolver.getRecipeBags(
          user,
          "write",
          persistence,
          namespacedRecipe
        );
        if (!bags) {
          throw new HTTPError(
            `Recipe ${namespacedRecipe.recipe} not found in wiki ${namespacedRecipe.wiki}`,
            HTTP_NOT_FOUND
          );
        }
        // find first bag which we can write to
        const permissions = await this.policyChecker.getWriteableBag(
          persistence,
          user,
          namespacedRecipe.wiki,
          bags,
          key,
          getTiddlerData(updateOrCreate)
        );
        const bagToWrite = permissions.find((p) => p.allowed === true);
        if (!bagToWrite) {
          throw new HTTPError(
            `No bags in wiki ${namespacedRecipe.wiki} recipe ${
              namespacedRecipe.recipe
            } found which can be written to. Errors: ${permissions
              .filter((p) => p.reason)
              .map((p) => p.reason)
              .join(", ")}`,
            HTTP_FORBIDDEN
          );
        }
        return persistence.updateDoc(
          { wiki: namespacedRecipe.wiki, bag: bagToWrite.bag },
          key,
          this.getUpdater(user, key, updateOrCreate),
          getExpectedRevision(updateOrCreate)
        );
      }
    );
    return txResult!;
  }

  async removeFromBag(
    user: User,
    namespace: TiddlerNamespace,
    key: string,
    expectedRevision?: Revision
  ): Promise<boolean> {
    let tiddlerExisted = false;
    await this.transactionRunner.runTransaction(
      user,
      async (persistence: StandardTiddlerPersistence) => {
        const writePermission = await this.policyChecker.verifyRemoveAccess(
          persistence,
          user,
          namespace.wiki,
          [namespace.bag],
        );
        if (writePermission[0].allowed) {
          const updater = (
            tiddler?: Tiddler
          ): MaybePromise<Tiddler | undefined> => {
            tiddlerExisted = tiddler !== undefined;
            return undefined;
          };
          return persistence.updateDoc(
            namespace,
            key,
            updater,
            expectedRevision
          );
        }
        throw new HTTPError(
          `Tiddler remove denied ${writePermission[0].reason || ""}`,
          HTTP_FORBIDDEN
        );
      }
    );
    return tiddlerExisted;
  }
}
