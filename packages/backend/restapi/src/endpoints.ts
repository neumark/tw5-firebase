import cors from 'cors';
import * as express from 'express';
import { inject, injectable } from 'inversify';
import { FirebaseConfig } from '@tw5-firebase/shared/src/model/config';
import { TW5FirebaseError, TW5FirebaseErrorCode } from '@tw5-firebase/shared/src/model//errors';
import { SingleWikiNamespacedTiddler } from '@tw5-firebase/shared/src/api/bag-api';
import { HTTPNamespacedTiddler, PartialTiddlerData } from '@tw5-firebase/shared/src/model/tiddler';
import { Logger } from '@tw5-firebase/shared/src/util/logger';
import { mapOrApply, maybeApply } from '@tw5-firebase/shared/src/util/map';
import { Component } from '@tw5-firebase/backend-shared/src/ioc/components';
import { tiddlerDataSchema } from '@tw5-firebase/shared/src/schema';
import { getValidator } from '@tw5-firebase/backend-shared/src/validator';
import { firebaseConfig } from '@tw5-firebase/backend-shared/src/config-reader';
import { AuthenticatorMiddleware } from './authentication';
import { sendErr } from './http-errors';
import { TiddlerStoreFactory } from './tiddler-store';

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

  private assertWikiInPath(params: express.Request['params']): void {
    if (!params['wiki']) {
      throw new TW5FirebaseError({
        code: TW5FirebaseErrorCode.INVALID_WIKI,
      });
    }
  }

  private async read(req: express.Request) {
    this.assertWikiInPath(req.params);
    const wiki = decodeURIComponent(req.params['wiki']);
    const bag = maybeApply(decodeURIComponent, req.params['bag']);
    const title = maybeApply(decodeURIComponent, req.params['title']);
    const store = this.tiddlerStoreFactory.createTiddlerStore(req.user, wiki);
    if (bag) {
      return mapOrApply(toHTTPNamespacedTiddler, await store.read(bag, title));
    }
    throw new TW5FirebaseError({
      code: TW5FirebaseErrorCode.BAD_REQUEST_PARAMS,
      data: { params: req.params },
    });
  }

  private async write(req: express.Request) {
    this.assertWikiInPath(req.params);
    const wiki = decodeURIComponent(req.params['wiki']);
    const bag = maybeApply(decodeURIComponent, req.params['bag']);
    const title = decodeURIComponent(req.params['title']);
    const expectedRevision = maybeApply(decodeURIComponent, req.params['revision']);
    const body = req.body;
    const tiddlerValidation = this.tiddlerDataValidator(body);
    if (!tiddlerValidation.valid) {
      throw new TW5FirebaseError({
        code: TW5FirebaseErrorCode.INVALID_REQUEST_BODY,
        data: { body, errors: tiddlerValidation.errors },
      });
    }
    const tiddlerData = body as PartialTiddlerData;
    const store = this.tiddlerStoreFactory.createTiddlerStore(req.user, wiki);
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
    this.assertWikiInPath(req.params);
    const wiki = decodeURIComponent(req.params['wiki']);
    const bag = decodeURIComponent(req.params['bag']);
    const title = decodeURIComponent(req.params['title']);
    const expectedRevision = decodeURIComponent(req.params['revision']);
    if (wiki && bag && title && expectedRevision) {
      const store = this.tiddlerStoreFactory.createTiddlerStore(req.user, wiki);
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

  private async firebaseConfig(req: express.Request):Promise<FirebaseConfig> {
    return firebaseConfig;
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
    api.use(cors({ origin: true }));
    const authHandler = this.authenticatorMiddleware.authenticate.bind(this.authenticatorMiddleware);
    const write = this.bindAndSerialize(this.write);
    api.get('/firebase-config', this.bindAndSerialize(this.firebaseConfig)); // create
    api.post('/:wiki/bags/:bag/tiddlers/:title', authHandler, write); // create
    api.get('/:wiki/bags/:bag/tiddlers/:title?', authHandler, this.bindAndSerialize(this.read)); // read
    api.post('/:wiki/bags/:bag/tiddlers/:title/revisions/:revision', authHandler, write); // update
    api.delete('/:wiki/bags/:bag/tiddlers/:title/revisions/:revision', authHandler, this.bindAndSerialize(this.remove)); // delete
    return api;
  }
}
