/* TiddlyWeb URLs: https://tank.peermore.com/search?q=tag%3ahttpapi
 * We don't need most of these.
    /
    /bags
    /bags/{bag_name}
    /bags/{bag_name}/tiddlers
    /bags/{bag_name}/tiddlers/{tiddler_title}
    /bags/{bag_name}/tiddlers/{tiddler_title}/revisions
    /bags/{bag_name}/tiddlers/{tiddler_title}/revisions/{revision}
    /recipes
    /recipes/{recipe_name}
    /recipes/{recipe_name}/tiddlers
    /recipes/{recipe_name}/tiddlers/{tiddler_title}
    /recipes/{recipe_name}/tiddlers/{tiddler_title}/revisions
    /recipes/{recipe_name}/tiddlers/{tiddler_title}/revisions/{revision}
    /search

    Since the HTTP JSON is different from tiddlyweb's, having the same URLs is not such a big win,
    but there's no reason to diverge.
 */

import cors from 'cors';
import * as express from 'express';
import { inject, injectable } from 'inversify';
import { TW5FirebaseError, TW5FirebaseErrorCode } from '../../shared/model/errors';
import { SingleWikiNamespacedTiddler } from '../../shared/model/store';
import { HTTPNamespacedTiddler, PartialTiddlerData } from '../../shared/model/tiddler';
import { Logger } from '../../shared/util/logger';
import { mapOrApply, maybeApply } from '../../shared/util/map';
import { Component } from '../common/ioc/components';
import { tiddlerDataSchema } from '../common/schema';
import { getValidator } from '../common/validator';
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
        const recipe = maybeApply(decodeURIComponent, req.params['recipe']);
        const title = maybeApply(decodeURIComponent, req.params['title']);
        const store = this.tiddlerStoreFactory.createTiddlerStore(req.user, wiki);
        if (bag) {
            return mapOrApply(toHTTPNamespacedTiddler, await store.readFromBag(bag, title));
        }
        if (recipe) {
            return mapOrApply(toHTTPNamespacedTiddler, await store.readFromRecipe(recipe, title));
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
        const recipe = maybeApply(decodeURIComponent, req.params['recipe']);
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
                return toHTTPNamespacedTiddler(await store.updateInBag(bag, title, tiddlerData, expectedRevision));
            }
            return toHTTPNamespacedTiddler(await store.createInBag(bag, title, tiddlerData));
        }
        if (recipe) {
            if (expectedRevision) {
                throw new TW5FirebaseError({
                    code: TW5FirebaseErrorCode.ATTEMPTED_UPDATE_IN_RECIPE,
                    data: { recipe },
                });
            }
            return toHTTPNamespacedTiddler(await store.createInRecipe(recipe, title, tiddlerData));
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
            return store.deleteFromBag(bag, title, expectedRevision);
        }
        throw new TW5FirebaseError({
            code: TW5FirebaseErrorCode.BAD_REQUEST_PARAMS,
            data: { params: req.params },
        });
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
        api.use(this.authenticatorMiddleware.authenticate.bind(this.authenticatorMiddleware));
        const read = this.bindAndSerialize(this.read);
        const write = this.bindAndSerialize(this.write);
        api.get('/:wiki/recipes/:recipe/tiddlers/:title?', read);
        api.get('/:wiki/bags/:bag/tiddlers/:title?', read);
        api.put('/:wiki/recipes/:recipe/tiddlers/:title', write); // create
        api.put('/:wiki/recipes/:recipe/tiddlers/:title/revisions/:revision', write); // update
        api.put('/:wiki/bags/:bag/tiddlers/:title', write); // create
        api.put('/:wiki/bags/:bag/tiddlers/:title/revisions/:revision', write); // update
        api.delete('/:wiki/bags/:bag/tiddlers/:title/revisions/:revision', this.bindAndSerialize(this.remove));
        return api;
    }
}
