import { inject, injectable } from 'inversify';
import { TW5FirebaseError, TW5FirebaseErrorCode } from '../../shared/model/errors';
import { getRevision, Revision } from '../../shared/model/revision';
import { SingleWikiNamespacedTiddler, TiddlerStore } from '../../shared/model/store';
import { PartialTiddlerData, Tiddler, TiddlerData, TiddlerNamespace } from '../../shared/model/tiddler';
import { User } from '../../shared/model/user';
import { Logger } from '../../shared/util/logger';
import { getTimestamp as _getTimestamp } from '../../shared/util/time';
import { MaybeArray } from '../../shared/util/useful-types';
import { Component } from '../common/ioc/components';
import { TiddlerPersistence, TransactionRunner } from '../common/persistence/interfaces';
import { TiddlerFactory } from '../common/tiddler-factory';
import { PolicyChecker } from './policy-checker';
import { RecipeResolver } from './recipe-resolver';

const deduplicate = (tiddlers: SingleWikiNamespacedTiddler[]): SingleWikiNamespacedTiddler[] => {
  const encounteredTitles = new Set<string>();
  const deduplicated: SingleWikiNamespacedTiddler[] = [];
  for (const t of tiddlers) {
    if (encounteredTitles.has(t.tiddler.title)) {
      continue;
    }
    deduplicated.push(t);
  }
  return deduplicated;
};

const convert = (t: {
  namespace: TiddlerNamespace;
  tiddler: Tiddler;
  revision: Revision;
}): SingleWikiNamespacedTiddler => ({
  bag: t.namespace.bag,
  tiddler: t.tiddler,
  revision: t.revision,
});

const first = <T>(predicate: (e: T) => boolean, arr: T[]): T | undefined => {
  for (const e of arr) {
    if (predicate(e)) {
      return e;
    }
  }
  return undefined;
};

class TiddlerStoreImpl implements TiddlerStore {
  private user: User;
  private wiki: string;
  private transactionRunner: TransactionRunner;
  private policyChecker: PolicyChecker;
  private recipeResolver: RecipeResolver;
  private getTimestamp: typeof _getTimestamp;
  private tiddlerFactory: TiddlerFactory;
  private logger: Logger;

  private async getWriteableBag(
    persistence: TiddlerPersistence,
    bags: string[],
    title: string,
    tiddlerData: PartialTiddlerData,
  ): Promise<string> {
    const permissions = await this.policyChecker.verifyWriteAccess(
      persistence,
      this.user,
      this.wiki,
      bags,
      title,
      tiddlerData,
    );
    const allowPermission = first((p) => p.allowed, permissions);
    if (!allowPermission) {
      throw new TW5FirebaseError({
        code: TW5FirebaseErrorCode.NO_WRITABLE_BAG_IN_RECIPE,
        data: {
          title,
          user: this.user,
          permissions,
          tiddlerData,
        },
      });
    }
    return allowPermission.bag;
  }

  private async doReadTiddlers(persistence: TiddlerPersistence, bags: string[], title?: string) {
    const permissions = await this.policyChecker.verifyReadAccess(persistence, this.user, this.wiki, bags);
    if (!permissions.every((p) => p.allowed)) {
      if (bags.length === 1) {
        throw new TW5FirebaseError({
          code: TW5FirebaseErrorCode.READ_ACCESS_DENIED_TO_BAG,
          data: {
            user: this.user,
            ...permissions[0],
          },
        });
      } else {
        throw new TW5FirebaseError({
          code: TW5FirebaseErrorCode.UNREADABLE_BAG_IN_RECIPE,
          data: {
            user: this.user,
            permissions,
            title,
          },
        });
      }
    }
    if (title) {
      const tiddlers = await persistence.readTiddlers(
        bags.map((bag) => ({ namespace: { wiki: this.wiki, bag }, title })),
      );
      if (tiddlers.length < 1) {
        throw new TW5FirebaseError({
          code: TW5FirebaseErrorCode.TIDDLER_NOT_FOUND,
          data: {
            title,
            bags,
          },
        });
      }
      return convert(tiddlers[0]);
    } else {
      const tiddlers = await persistence.readBags(bags.map((bag) => ({ wiki: this.wiki, bag })));
      return deduplicate(tiddlers.map(convert));
    }
  }

  private async doCreateTiddler(
    persistence: TiddlerPersistence,
    bags: string[],
    title: string,
    tiddlerData: PartialTiddlerData,
  ) {
    const bag = await this.getWriteableBag(persistence, bags, title, tiddlerData);
    const revision = getRevision(this.user, this.getTimestamp());
    const tiddler = this.tiddlerFactory.createTiddler(this.user, title, tiddlerData.type, tiddlerData);
    await persistence.createTiddler({ wiki: this.wiki, bag }, tiddler, revision);
    return { bag, tiddler, revision };
  }

  private async doUpdateTiddler(
    persistence: TiddlerPersistence,
    bags: string[],
    title: string,
    tiddlerData: PartialTiddlerData,
    expectedRevision: Revision,
  ) {
    const bag = await this.getWriteableBag(persistence, bags, title, tiddlerData);
    const revision = getRevision(this.user, this.getTimestamp());
    const { tiddler } = await persistence.updateTiddler(
      { wiki: this.wiki, bag },
      title,
      (oldTiddler: Tiddler) =>
        Promise.resolve({
          tiddler: Object.assign({}, oldTiddler, tiddlerData),
          revision,
        }),
      expectedRevision,
    );
    return { bag, tiddler, revision };
  }

  constructor(
    user: User,
    wiki: string,
    transactionRunner: TransactionRunner,
    policyChecker: PolicyChecker,
    recipeResolver: RecipeResolver,
    getTimestamp: typeof _getTimestamp,
    tiddlerFactory: TiddlerFactory,
    logger: Logger,
  ) {
    this.user = user;
    this.wiki = wiki;
    this.transactionRunner = transactionRunner;
    this.policyChecker = policyChecker;
    this.recipeResolver = recipeResolver;
    this.getTimestamp = getTimestamp;
    this.tiddlerFactory = tiddlerFactory;
    this.logger = logger;
  }

  deleteFromBag(bag: string, title: string, expectedRevision: string): Promise<boolean> {
    // break this up into two transactions
    return this.transactionRunner.runTransaction(async (persistence: TiddlerPersistence) => {
      const [removePermission] = await this.policyChecker.verifyRemoveAccess(persistence, this.user, this.wiki, [bag]);
      if (!removePermission.allowed) {
        throw new TW5FirebaseError({
          code: TW5FirebaseErrorCode.WRITE_ACCESS_DENIED_TO_BAG,
          data: {
            user: this.user,
            ...removePermission,
          },
        });
      }
      this.logger.info(`tiddler-store.ts:deleteFromBag(): about to delete ${title}`);
      try {
        const result = await persistence.removeTiddler({ wiki: this.wiki, bag }, title, expectedRevision);
        return result.existed;
      } catch (e) {
        this.logger.error(e.stack);
        throw e;
      }
    });
  }

  createInRecipe(
    recipe: string,
    title: string,
    tiddlerData: Partial<TiddlerData>,
  ): Promise<SingleWikiNamespacedTiddler> {
    return this.transactionRunner.runTransaction(async (persistence: TiddlerPersistence) => {
      const bags = await this.recipeResolver.getRecipeBags(this.user, 'write', persistence, {
        wiki: this.wiki,
        recipe,
      });
      if (!bags) {
        throw new TW5FirebaseError({
          code: TW5FirebaseErrorCode.RECIPE_NOT_FOUND,
          data: {
            recipe,
          },
        });
      }
      return this.doCreateTiddler(persistence, bags, title, tiddlerData);
    });
  }

  createInBag(bag: string, title: string, tiddlerData: Partial<TiddlerData>): Promise<SingleWikiNamespacedTiddler> {
    return this.transactionRunner.runTransaction(async (persistence: TiddlerPersistence) => {
      return this.doCreateTiddler(persistence, [bag], title, tiddlerData);
    });
  }

  updateInBag(
    bag: string,
    title: string,
    tiddlerData: Partial<TiddlerData>,
    expectedRevision: string,
  ): Promise<SingleWikiNamespacedTiddler> {
    return this.transactionRunner.runTransaction(async (persistence: TiddlerPersistence) => {
      return this.doUpdateTiddler(persistence, [bag], title, tiddlerData, expectedRevision);
    });
  }

  readFromRecipe(recipe: string, title?: string): Promise<MaybeArray<SingleWikiNamespacedTiddler>> {
    return this.transactionRunner.runTransaction(async (persistence: TiddlerPersistence) => {
      const bags = await this.recipeResolver.getRecipeBags(this.user, 'read', persistence, {
        wiki: this.wiki,
        recipe,
      });
      if (!bags) {
        throw new TW5FirebaseError({
          code: TW5FirebaseErrorCode.RECIPE_NOT_FOUND,
          data: {
            recipe,
          },
        });
      }
      return await this.doReadTiddlers(persistence, bags, title);
    });
  }

  readFromBag(bag: string, title?: string): Promise<MaybeArray<SingleWikiNamespacedTiddler>> {
    return this.transactionRunner.runTransaction(async (persistence: TiddlerPersistence) => {
      return await this.doReadTiddlers(persistence, [bag], title);
    });
  }
}

@injectable()
export class TiddlerStoreFactory {
  private transactionRunner: TransactionRunner;
  private policyChecker: PolicyChecker;
  private recipeResolver: RecipeResolver;
  private getTimestamp: typeof _getTimestamp;
  private tiddlerFactory: TiddlerFactory;
  private logger: Logger;

  constructor(
    @inject(Component.TransactionRunner) transactionRunner: TransactionRunner,
    @inject(Component.PolicyChecker) policyChecker: PolicyChecker,
    @inject(Component.RecipeResolver) recipeResolver: RecipeResolver,
    @inject(Component.getTimestamp) getTimestamp: typeof _getTimestamp,
    @inject(Component.TiddlerFactory) tiddlerFactory: TiddlerFactory,
    @inject(Component.Logger) logger: Logger,
  ) {
    this.transactionRunner = transactionRunner;
    this.policyChecker = policyChecker;
    this.recipeResolver = recipeResolver;
    this.getTimestamp = getTimestamp;
    this.tiddlerFactory = tiddlerFactory;
    this.logger = logger;
  }

  createTiddlerStore(user: User, wiki: string): TiddlerStore {
    return new TiddlerStoreImpl(
      user,
      wiki,
      this.transactionRunner,
      this.policyChecker,
      this.recipeResolver,
      this.getTimestamp,
      this.tiddlerFactory,
      this.logger,
    );
  }
}
