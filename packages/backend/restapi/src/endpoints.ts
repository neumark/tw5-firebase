import cors from 'cors';
import * as express from 'express';
import { inject, injectable } from 'inversify';
import { WikiInitState } from '@tw5-firebase/shared/src/model/config';
import { BodyValidationError, TW5FirebaseError, TW5FirebaseErrorCode } from '@tw5-firebase/shared/src/model//errors';
import { SingleWikiNamespacedTiddler } from '@tw5-firebase/shared/src/api/bag-api';
import { HTTPNamespacedTiddler, PartialTiddlerData } from '@tw5-firebase/shared/src/model/tiddler';
import { Logger } from '@tw5-firebase/shared/src/util/logger';
import { mapOrApply, maybeApply } from '@tw5-firebase/shared/src/util/map';
import { Component } from '@tw5-firebase/backend-shared/src/ioc/components';
import { resolveDefaultRecipe } from '@tw5-firebase/backend-shared/src/recipe-resolver';
import { tiddlerDataSchema } from '@tw5-firebase/shared/src/schema';
import { getValidator } from '@tw5-firebase/shared/src/util/validator';
import { AuthenticatorMiddleware } from './authentication';
import { sendErr } from './http-errors';
import { TiddlerStoreFactory } from './tiddler-store';
import { getRoleName } from '@tw5-firebase/shared/src/model/roles';
import { User } from '@tw5-firebase/shared/src/model/user';
import { ROUTES } from '@tw5-firebase/shared/src/api/routes';
import {getRole} from '@tw5-firebase/backend-shared/src/role-io'

const toHTTPNamespacedTiddler = (namespacedTiddler: SingleWikiNamespacedTiddler): HTTPNamespacedTiddler => ({
  bag: namespacedTiddler.bag,
  revision: namespacedTiddler.revision,
  tiddler: {
    ...namespacedTiddler.tiddler,
    modified: namespacedTiddler.tiddler.modified.toISOString(),
    created: namespacedTiddler.tiddler.created.toISOString(),
  },
});

@injectable()
export class APIEndpointFactory {
  private authenticatorMiddleware: AuthenticatorMiddleware;
  private logger: Logger;
  private tiddlerDataValidator = getValidator(tiddlerDataSchema);
  private tiddlerStoreFactory: TiddlerStoreFactory;

  private assertWikiInPath(params: express.Request['params']): string {
    if (!params['wiki']) {
      throw new TW5FirebaseError({
        code: TW5FirebaseErrorCode.INVALID_WIKI,
      });
    }
    return decodeURIComponent(params['wiki']);
  }

  private assertAuthenticatedUser(user:User|undefined): User {
    if (!user) {
      throw new TW5FirebaseError({
        code: TW5FirebaseErrorCode.NO_AUTHENTICATED_USER,
      });
    }
    return user;
  }

  private async read(req: express.Request) {
    const wiki = this.assertWikiInPath(req.params);
    const bag = maybeApply(decodeURIComponent, req.params['bag']);
    const title = maybeApply(decodeURIComponent, req.params['title']);
    const store = this.tiddlerStoreFactory.createTiddlerStore(
      wiki,
      this.assertAuthenticatedUser(req.user));
    if (bag) {
      return mapOrApply(toHTTPNamespacedTiddler, await store.read(bag, title));
    }
    throw new TW5FirebaseError({
      code: TW5FirebaseErrorCode.BAD_REQUEST_PARAMS,
      data: { params: req.params },
    });
  }

  private async write(req: express.Request) {
    const wiki = this.assertWikiInPath(req.params);
    const bag = maybeApply(decodeURIComponent, req.params['bag']);
    const title = decodeURIComponent(req.params['title']);
    const expectedRevision = maybeApply(decodeURIComponent, req.params['revision']);
    const body = req.body;
    const tiddlerValidation = this.tiddlerDataValidator(body);
    if (!tiddlerValidation.valid) {
      throw new TW5FirebaseError({
        code: TW5FirebaseErrorCode.INVALID_REQUEST_BODY,
        data: { body, errors: tiddlerValidation.errors  as BodyValidationError[]},
      });
    }
    const tiddlerData = body as PartialTiddlerData;
    const store = this.tiddlerStoreFactory.createTiddlerStore(wiki, this.assertAuthenticatedUser(req.user));
    if (bag) {
      if (expectedRevision) {
        return toHTTPNamespacedTiddler(await store.update(bag, title, tiddlerData, expectedRevision));
      }
      return toHTTPNamespacedTiddler(await store.create(bag, title, tiddlerData));
    }
    throw new TW5FirebaseError({
      code: TW5FirebaseErrorCode.BAD_REQUEST_PARAMS,
      data: { params: req.params },
    });
  }

  private async remove(req: express.Request) {
    const wiki = this.assertWikiInPath(req.params);
    const bag = decodeURIComponent(req.params['bag']);
    const title = decodeURIComponent(req.params['title']);
    const expectedRevision = decodeURIComponent(req.params['revision']);
    if (wiki && bag && title && expectedRevision) {
      const store = this.tiddlerStoreFactory.createTiddlerStore(wiki, this.assertAuthenticatedUser(req.user));
      this.logger.info(`about to delete ${title}`);
      try {
        const result = await store.del(bag, title, expectedRevision);
        return result;
      } catch (e) {
        this.logger.error(`error deleting ${title}`, e.stack);
      }
    }
    throw new TW5FirebaseError({
      code: TW5FirebaseErrorCode.BAD_REQUEST_PARAMS,
      data: { params: req.params },
    });
  }

  private async init(req: express.Request):Promise<WikiInitState> {
    const user = this.assertAuthenticatedUser(req.user);
    const store = await this.tiddlerStoreFactory.createTiddlerStore(this.assertWikiInPath(req.params));
    const role = await getRole(store, user);
    return {
      role: getRoleName(role),
      resolvedRecipe: resolveDefaultRecipe(user, role)
    }
  }

  private bindAndSerialize(fn: (req: express.Request) => Promise<any>) {
    const boundFn = fn.bind(this);
    return (req: express.Request, res: express.Response, next: any) => {
      return Promise.resolve(boundFn(req))
        .then((body) => res.json(body))
        .catch((err) => sendErr(err, this.logger, res));
    };
  }

  constructor(
    @inject(Component.AuthenticatorMiddleware)
    authenticatorMiddleware: AuthenticatorMiddleware,
    @inject(Component.TiddlerStoreFactory)
    tiddlerStoreFactory: TiddlerStoreFactory,
    @inject(Component.Logger) logger: Logger,
  ) {
    this.authenticatorMiddleware = authenticatorMiddleware;
    this.tiddlerStoreFactory = tiddlerStoreFactory;
    this.logger = logger;
  }

  createAPI() {
    const api = express.default();
    // TODO: only allow requests from whitelisted domains
    api.use(cors({ origin: true }));
    api.use(this.authenticatorMiddleware.authenticate.bind(this.authenticatorMiddleware));
    const write = this.bindAndSerialize(this.write);
    api.get(ROUTES.RESTAPI_INIT, this.bindAndSerialize(this.init)); // get firebase config for client sdk
    api.post(ROUTES.RESTAPI_CREATE, write); // create
    api.get(ROUTES.RESTAPI_READ, this.bindAndSerialize(this.read)); // read
    api.post(ROUTES.RESTAPI_UPDATE_DELETE, write); // update
    api.delete(ROUTES.RESTAPI_UPDATE_DELETE, this.bindAndSerialize(this.remove)); // delete
    return api;
  }
}
