import { getServiceIdentifierAsString, inject, injectable } from "inversify";
import { User } from "../../model/user";
import { Revision, Tiddler, TiddlerNamespace } from "src/model/tiddler";
import { Modify } from "../../util/modify";
import { Component } from "../common/ioc/components";
import { FirestoreSerializedTiddler } from "../common/persistence/firestore-persistence";
import { MaybePromise, Persistence, StandardTiddlerPersistence, TransactionRunner } from "../common/persistence/interfaces";
import { PolicyChecker } from "./policy-checker";
import { HTTPError, HTTP_FORBIDDEN, HTTP_NOT_FOUND } from "./errors";
import { TiddlerValidator, TiddlerValidatorFactory } from "../common/persistence/tiddler-validator-factory";
import { recipesSchema } from "../common/schema";
import { defaultRecipe, NamespacedRecipe, Recipe, Recipes } from "../../model/recipe";
import {DEFAULT_RECIPE, BUILTIN_BAG_SYSTEM, RECIPES_TIDDLER} from "../../constants"
import { RecipeResolver } from "./recipe-resolver";

type NamespacedTiddler = {namespace:TiddlerNamespace, key:string, value:Tiddler, revision:Revision};

@injectable()
export class TiddlerStore {
  private transactionRunner: TransactionRunner;
  private permissionChecker: PolicyChecker;
  private recipeResolver: RecipeResolver;

  private deduplicate(tiddlers: { namespace: TiddlerNamespace; key: string; value: Tiddler; revision: string; }[]): { namespace: TiddlerNamespace; key: string; value: Tiddler; revision: string; }[] {
    const encounteredKeys = new Set<string>();
    const deduplicated: { namespace: TiddlerNamespace; key: string; value: Tiddler; revision: string; }[] = [];
    for (let tiddler of tiddlers) {
      if (encounteredKeys.has(tiddler.key)) {
        continue;
      }
      deduplicated.push(tiddler);
    }
    return deduplicated;
  }

  private getFirst(tiddlers: { namespace: TiddlerNamespace; key: string; value: Tiddler; revision: string; }[], key: string): { namespace: TiddlerNamespace; key: string; value: Tiddler; revision: string; }|undefined {
    return tiddlers.find(t => t.key === key);
  }

  constructor(
    @inject(Component.TransactionRunner) transactionRunner: TransactionRunner,
    @inject(Component.PolicyChecker) permissionChecker: PolicyChecker,
    @inject(Component.RecipeResolver) recipeResolver: RecipeResolver
  ) {
    this.transactionRunner = transactionRunner;
    this.permissionChecker = permissionChecker;
    this.recipeResolver = recipeResolver;
  }

  async readFromBag(user:User, namespace:TiddlerNamespace, key?:string):Promise<NamespacedTiddler|Array<NamespacedTiddler>> {
    return this.transactionRunner.runTransaction(async (persistence:StandardTiddlerPersistence) => {
      const readPermission = await this.permissionChecker.checkPermission(user, namespace.wiki, 'read', [namespace.bag], persistence);
      if (readPermission[0].allowed) {
        const tiddlers = await (key ? persistence.readDocs([{namespace, key}]) : persistence.readCollections([namespace]) );
        if (key) {
          // unpack array if specific tiddler requested
          if (tiddlers.length < 1) {
            throw new HTTPError(`Tiddler ${key} not found in wiki ${namespace.wiki} bag ${namespace.bag}`, HTTP_NOT_FOUND)
          }
          return tiddlers[0];
        }
        return tiddlers;
      }
      throw new HTTPError(`Tiddler read denied ${readPermission[0].reason || ''}`, HTTP_FORBIDDEN);
    })
  }

  async readFromRecipe(user:User, namespacedRecipe:NamespacedRecipe, key?:string):Promise<NamespacedTiddler|Array<NamespacedTiddler>> {
    return this.transactionRunner.runTransaction(async (persistence:StandardTiddlerPersistence) => {
      const bags = await this.recipeResolver.getRecipeBags(user, 'read', persistence, namespacedRecipe);
      if (!bags) {
        throw new HTTPError(`Recipe ${namespacedRecipe.recipe} not found in wiki ${namespacedRecipe.wiki}`, HTTP_NOT_FOUND);
      }
      const tiddlers = await persistence.readCollections(bags.map(bag => ({wiki: namespacedRecipe.wiki, bag})));
      if (key) {
        const tiddler = this.getFirst(tiddlers, key);
        if (!tiddler) {
          throw new HTTPError(`Tiddler ${key} not found in wiki ${namespacedRecipe.wiki} recipe ${namespacedRecipe.recipe}`, HTTP_NOT_FOUND);
        }
        return tiddler;
      } else {
        return this.deduplicate(tiddlers);
      }
    });
  }

  async writeToBag(user:User, namespace:TiddlerNamespace, key:string, value:Tiddler, expectedRevision?:Revision):Promise<{ namespace: TiddlerNamespace; key: string; value: Tiddler; revision: string; }> {
    const txResult = await this.transactionRunner.runTransaction(async (persistence:StandardTiddlerPersistence) => {
      const updater = (tidder?:Tiddler):MaybePromise<Tiddler|undefined> => {
        return undefined;
      };
      return persistence.updateDoc(namespace, key, updater, expectedRevision);
    });
  }

  async removeTiddlerFromBag(user:User, namespace:TiddlerNamespace, key:string, expectedRevision?:Revision):Promise<boolean> {

  }

  async readTiddlersFromRecipe(user:User, recipe:NamespacedRecipe):Promise<Array<{namespace:TiddlerNamespace, key:string, value:Tiddler}>> {
    // resolve recipe
    return [];
  }

  async writeTiddlerToRecipe(user:User,recipe:NamespacedRecipe, key:string, value:Tiddler):Promise<{namespace:TiddlerNamespace, key:string, value:Tiddler}> {
    // resolve recipe
    return [];
  }
}

const firstOrFallback = <T> (list:T[], fallback:T|null=null) => list.length > 0 ? list[0] : fallback;


const prepareTiddler = (context:Context, user:User, currentVersion:FirestoreSerializedTiddler, previousVersion?:FirestoreSerializedTiddler):FirestoreSerializedTiddler => {
  const timestamp = context.getTimestamp();
  const firestoreTS = dateToFirestoreTimestamp(timestamp);
  const newRevision = getRevision(user, timestamp);
  const modifier = username(user);
  const newTiddler = Object.assign({}, currentVersion, {
      creator: previousVersion ? previousVersion.creator : modifier,
      modifier,
      created: previousVersion ? previousVersion.created : firestoreTS,
      modified: firestoreTS,
      revision: newRevision
  });
  return newTiddler;
};

export class TiddlerStore2 {
  private persistence: Persistence<string, Tiddler>;
  constructor(persistence: Persistence<string, Tiddler>) {
    this.persistence = persistence;
  }

  public async readTiddler (tiddlerId:Modify<TiddlerID, {
    // like tiddlerId, but can optionally search in multiple bags.
    bag: string[]|string}>):Promise<Tiddler|null> {
      return null;
  }

  public async readBags (wiki:string, bag:string[]):Promise<TiddlerWithBag[]> {

    return [];
  }

  public async writeTiddler (user:User, tiddlerId:TiddlerID, tiddler: Tiddler):Promise<Revision> {

  }

  public async removeTiddler(tiddlerId:TiddlerID):Promise<string> {

  }
}