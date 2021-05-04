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

import cors from "cors";
import * as express from "express";
import { inject, injectable } from "inversify";
import {
  SingleWikiNamespacedTiddler,
  TiddlerUpdateOrCreate
} from "../../shared/model/store";
import {
  HTTPNamespacedTiddler,

  PartialTiddlerData
} from "../../shared/model/tiddler";
import { Logger } from "../../shared/util/logger";
import { mapOrApply, maybeApply } from "../../shared/util/map";
import { Component } from "../common/ioc/components";
import { tiddlerDataSchema } from "../common/schema";
import { getValidator } from "../common/validator";
import { AuthenticatorMiddleware } from "./authentication";
import { HTTPError, HTTP_BAD_REQUEST, sendErr } from "./errors";
import { TiddlerStoreFactory } from "./tiddler-store";

const toHTTPNamespacedTiddler = (
  namespacedTiddler: SingleWikiNamespacedTiddler
): HTTPNamespacedTiddler => ({
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

  private async read(req: express.Request) {
    const wiki = decodeURIComponent(req.params["wiki"]);
    const bag = maybeApply(decodeURIComponent, req.params["bag"]);
    const recipe = maybeApply(decodeURIComponent, req.params["recipe"]);
    const title = maybeApply(decodeURIComponent, req.params["title"]);
    if (!wiki) {
      throw new HTTPError(`invalid wiki: ${wiki}`, HTTP_BAD_REQUEST);
    }
    const store = this.tiddlerStoreFactory.createTiddlerStore(req.user, wiki);
    if (bag) {
      return mapOrApply(
        toHTTPNamespacedTiddler,
        await store.readFromBag(bag, title)
      );
    }
    if (recipe) {
      return mapOrApply(
        toHTTPNamespacedTiddler,
        await store.readFromRecipe(recipe, title)
      );
    }
    throw new HTTPError(
      `read() got weird request parameters: ${JSON.stringify(req.params)}`,
      HTTP_BAD_REQUEST
    );
  }

  private async write(req: express.Request) {
    const wiki = req.params["wiki"];
    const bag = maybeApply(decodeURIComponent, req.params["bag"]);
    const recipe = maybeApply(decodeURIComponent, req.params["recipe"]);
    const title = decodeURIComponent(req.params["title"]);
    const expectedRevision = maybeApply(decodeURIComponent, req.params["revision"]);
    if (!wiki) {
      throw new HTTPError(`invalid wiki: ${wiki}`, HTTP_BAD_REQUEST);
    }
    const tiddlerValidation = this.tiddlerDataValidator(req.body);
    if (!tiddlerValidation.valid) {
      throw new HTTPError(
        `write() got invalid tiddler data. Validation errors: ${JSON.stringify(
          tiddlerValidation.errors
        )}`
      );
    }
    const body = req.body as PartialTiddlerData;
    const updateOrCreate: TiddlerUpdateOrCreate = expectedRevision
      ? { update: body, expectedRevision }
      : { create: body };
    const store = this.tiddlerStoreFactory.createTiddlerStore(req.user, wiki);
    if (bag) {
      return toHTTPNamespacedTiddler(
        await store.writeToBag(bag, title, updateOrCreate)
      );
    }
    if (recipe) {
      return toHTTPNamespacedTiddler(
        await store.writeToRecipe(recipe, title, updateOrCreate)
      );
    }
    throw new HTTPError(
      `read() got weird request parameters: ${JSON.stringify(req.params)}`,
      HTTP_BAD_REQUEST
    );
  }

  private async remove(req: express.Request) {
    const wiki = decodeURIComponent(req.params["wiki"]);
    const bag = decodeURIComponent(req.params["bag"]);
    const title = decodeURIComponent(req.params["title"]);
    const expectedRevision = decodeURIComponent(req.params["revision"]);
    if (wiki && bag && title && expectedRevision) {
      const store = this.tiddlerStoreFactory.createTiddlerStore(req.user, wiki);
      return store.removeFromBag(bag, title, expectedRevision);
    }
    throw new HTTPError(
      `read() got weird request parameters: ${JSON.stringify(req.params)}`,
      HTTP_BAD_REQUEST
    );
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
    @inject(Component.Logger) logger: Logger
  ) {
    this.authenticatorMiddleware = authenticatorMiddleware;
    this.tiddlerStoreFactory = tiddlerStoreFactory;
    this.logger = logger;
  }

  createAPI() {
    const api = express.default();
    api.use(cors({origin: true}));
    api.use(
      this.authenticatorMiddleware.authenticate.bind(
        this.authenticatorMiddleware
      )
    );
    const read = this.bindAndSerialize(this.read);
    const write = this.bindAndSerialize(this.write);
    api.get("/:wiki/recipes/:recipe/tiddlers/:title?", read);
    api.get("/:wiki/bags/:bag/tiddlers/:title?", read);
    api.put("/:wiki/recipes/:recipe/tiddlers/:title", write); // create
    api.put(
      "/:wiki/recipes/:recipe/tiddlers/:title/revisions/:revision",
      write
    ); // update
    api.put("/:wiki/bags/:bag/tiddlers/:title", write); // create
    api.put("/:wiki/bags/:bag/tiddlers/:title/revisions/:revision", write); // update
    api.delete(
      "/:wiki/bags/:bag/tiddlers/:title/revisions/:revision",
      this.bindAndSerialize(this.remove)
    );
    return api;
  }
}
