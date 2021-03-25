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
 */

import cors from "cors";
import * as express from "express";
import helmet from "helmet";
import { inject, injectable } from "inversify";
import { Logger } from "../../shared/util/logger";
import { Revision } from "../../shared/model/revision";
import { Tiddler } from "../../shared/model/tiddler";
import { Modify } from "../../shared/util/modify";
import { Component } from "../common/ioc/components";
import { AuthenticatorMiddleware } from "./authentication";
import { HTTPError, HTTP_BAD_REQUEST, sendErr } from "./errors";
import { NamespacedTiddler, TiddlerStore } from "./tiddler-store";

export type HTTPTiddler = Modify<Tiddler, {
  created: string,
  modified: string
}>

export interface HTTPNamespacedTiddler {bag: string, revision: Revision, tiddler:HTTPTiddler};

const toHTTP = (tiddler:Tiddler):HTTPTiddler => ({
  ...tiddler,
  modified: tiddler.modified.toISOString(),
  created: tiddler.created.toISOString()
});

const asResponse = (namespacedTiddlers:NamespacedTiddler|NamespacedTiddler[]):HTTPNamespacedTiddler|HTTPNamespacedTiddler[] => {
  const convert:(nst:NamespacedTiddler)=>HTTPNamespacedTiddler = ({value, namespace: {bag}, revision}) => ({revision, bag, tiddler: toHTTP(value)});
  if (Array.isArray(namespacedTiddlers)) {
    return namespacedTiddlers.map(convert);
  }
  return convert(namespacedTiddlers);
}

@injectable()
export class APIEndpointFactory {
  private authenticatorMiddleware: AuthenticatorMiddleware;
  private tiddlerStore: TiddlerStore;
  private logger: Logger;

  private async read(req: express.Request) {
    const wiki = req.params["wiki"];
    const bag = req.params["bag"];
    const recipe = req.params["recipe"];
    const tiddler = req.params["tiddler"];
    if (wiki && bag) {
      return asResponse(await this.tiddlerStore.readFromBag(req.user, { wiki, bag }, tiddler));
    }
    if (wiki && recipe) {
      return asResponse(await this.tiddlerStore.readFromRecipe(
        req.user,
        { wiki, recipe },
        tiddler
      ));
    }
    throw new HTTPError(
      `read() got weird request parameters: ${JSON.stringify(req.params)}`,
      HTTP_BAD_REQUEST
    );
  }

  private bindAndSerialize(fn:((req: express.Request)=>Promise<any>)) {
    const boundFn = fn.bind(this);
    return (req: express.Request, res: express.Response, next:any) => {
      return Promise.resolve(boundFn(req))
        .then(body => res.json(body))
        .catch(err => sendErr(err, this.logger, res));
    };
  }

  constructor(
    @inject(Component.AuthenticatorMiddleware)
    authenticatorMiddleware: AuthenticatorMiddleware,
    @inject(Component.TiddlerStore) tiddlerStore: TiddlerStore,
    @inject(Component.Logger) logger:Logger
  ) {
    this.authenticatorMiddleware = authenticatorMiddleware;
    this.tiddlerStore = tiddlerStore;
    this.logger = logger;
  }

  createAPI() {
    const api = express.default();
    // api.use(helmet());
    api.use(cors({ origin: true }));
    api.use(
      this.authenticatorMiddleware.authenticate.bind(
        this.authenticatorMiddleware
      )
    );
    api.get("/:wiki/recipes/:recipe/tiddlers/:tiddler?", this.bindAndSerialize(this.read));
    api.get("/:wiki/bags/:bag/tiddlers/:tiddler?", this.read.bind(this));
    //api.put('/:wiki/recipes/:recipe/tiddlers/:title', write as any);
    //api.put('/:wiki/bags/:bag/tiddlers/:title', write as any);
    //api.delete('/:wiki/bags/:bag/tiddlers/:title', remove as any);
    return api;
  }
}
