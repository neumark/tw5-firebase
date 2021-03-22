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

import * as express from 'express';
import * as admin from 'firebase-admin';


import { readTiddler, readBags, writeTiddler, removeTiddler } from '../common/persistence/firestore-persistence';
import { bagsWithAccess, hasAccess} from './policy-checker';
import { resolveRecipe } from './recipe';
import { HTTPError, HTTP_FORBIDDEN, HTTP_BAD_REQUEST, sendErr }  from './errors';
import { getUserRole, ROLES } from '../common/role';
import { getValidator, HTTPtiddlerSchema } from '../common/schema';
import { AuthenticatorMiddleware, username } from './authentication';
import { HTTPSerializedTiddler, Tiddler } from "src/model/tiddler";
import { parseDate } from "./tw";
import { User } from "../../model/user";
import { DEFAULT_TIDDLER_TYPE } from "../../constants";

import cors from 'cors';
import helmet from "helmet";

import {validateFirebaseIdToken } from './api/authentication';
import { productionStartup } from './common/startup';
import { Container, inject, injectable } from 'inversify';
import { Component } from '../common/ioc/components';
import { StandardTiddlerPersistence, TransactionRunner } from '../common/persistence/interfaces';


@injectable()
export class APIEndpointFactory {
  private authenticatorMiddleware: AuthenticatorMiddleware;
  private transactionRunner: TransactionRunner;

  constructor(
    @inject(Component.AuthenticatorMiddleware) authenticatorMiddleware: AuthenticatorMiddleware,
    @inject(Component.TransactionRunner) transactionRunner: TransactionRunner,
  ) {
    this.authenticatorMiddleware = authenticatorMiddleware;
    this.transactionRunner = transactionRunner;
  }

  createAPI ()  {
      const api = express.default();
      api.use(helmet());
      api.use(cors({origin: true}));
      api.use(this.authenticatorMiddleware.authenticate.bind(this.authenticatorMiddleware));

      api.get('/:wiki/recipes/:recipe/tiddlers/:title?', read as any);
      api.get('/:wiki/bags/:bag/tiddlers/:title?', read as any);
      api.put('/:wiki/recipes/:recipe/tiddlers/:title', write as any);
      api.put('/:wiki/bags/:bag/tiddlers/:title', write as any);
      api.delete('/:wiki/bags/:bag/tiddlers/:title', remove as any);
      return api;
  }

  async read(req:express.Request, res:express.Response) {
    // not prepared for anonymous users yet
    requireAuthenticatedUser(req);
    const wiki = req.params.wiki;
    const title = req.params.title;
    const role = getUserRole(wiki, req.user);
    return this.runTransaction(async persistence => {

        // when reading a recipe, user must have access to all bags (regardless of which bag contains requested tiddler).
        const bags = await (req.params.bag ? [req.params.bag] : resolveRecipe(context, transaction, wiki, req.params.recipe, req.user));
        if (bags.length === 0 || (await bagsWithAccess(context, transaction, wiki, bags, role, req.user, ACCESS_READ)).length < bags.length) {
          throw new HTTPError(`no ${ACCESS_READ} access granted to ${username(req.user!)} with role ${role} on wiki ${wiki} ${req.params.recipe ? "recipe " + req.params.recipe : "bag " + req.params.bag}${title? " tiddler " + JSON.stringify(title) : ""}`, HTTP_FORBIDDEN);
        }
        return title ? readTiddler(context, transaction, wiki, bags, title) : readBags(context, transaction, wiki, bags);
    }).then(
        res.json.bind(res),
        err => sendErr(res, err));
  };
}


const { read, write, remove } = getEndpoints(context);



export const getAPI = (container:Container): ReturnType<typeof createExpressAPI> => {
  const api = createExpressAPI();
  return api;
}


const validateTiddler = getValidator(HTTPtiddlerSchema);

const requireAuthenticatedUser = (req:express.Request) => {
    if (!req.user || !req.user.isAuthenticated) {
        throw new HTTPError('Unauthorized', 403);
    }
};

const readIncomingTiddler = (serializedTiddler:HTTPSerializedTiddler, user:User, getTimestamp:()=>Date):Tiddler => {
  const validationResult = validateTiddler(serializedTiddler);
  if (!validationResult.valid) {
    throw new HTTPError(`tiddler did not pass jsonschema validation: ${JSON.stringify(validationResult.errors)}`, HTTP_BAD_REQUEST);
  }
  const convertDate = (d?:string):Date => (typeof d === 'string' ? parseDate(d) : d ) || getTimestamp();
  const {created, creator, modifier, modified, bag, text, tags, fields, type, ...commonFields} = serializedTiddler;
  return Object.assign(commonFields, {
    creator: creator || username(user);
    modifier: modifier || username(user);
    created: convertDate(created),
    modified: convertDate(modified),
    text: text ? text : undefined,
    fields: fields || {},
    tags: tags || [],
    type: type || DEFAULT_TIDDLER_TYPE
  });
};

export type Handler = (req:express.Request, res:express.Response)=>Promise<any>;

const mkRead = (context:Context):Handler => (req:express.Request, res:express.Response) => {
  // not prepared for anonymous users yet
  requireAuthenticatedUser(req);
  const wiki = req.params.wiki;
  const title = req.params.title;
  const role = getUserRole(wiki, req.user);
  return context.runTransaction(async transaction => {
      // when reading a recipe, user must have access to all bags (regardless of which bag contains requested tiddler).
      const bags = await (req.params.bag ? [req.params.bag] : resolveRecipe(context, transaction, wiki, req.params.recipe, req.user));
      if (bags.length === 0 || (await bagsWithAccess(context, transaction, wiki, bags, role, req.user, ACCESS_READ)).length < bags.length) {
        throw new HTTPError(`no ${ACCESS_READ} access granted to ${username(req.user!)} with role ${role} on wiki ${wiki} ${req.params.recipe ? "recipe " + req.params.recipe : "bag " + req.params.bag}${title? " tiddler " + JSON.stringify(title) : ""}`, HTTP_FORBIDDEN);
      }
      return title ? readTiddler(context, transaction, wiki, bags, title) : readBags(context, transaction, wiki, bags);
  }).then(
      res.json.bind(res),
      err => sendErr(res, err));
};

const mkWrite = (context:Context):Handler => (req:express.Request, res:express.Response) => {
  // not prepared for anonymous users yet
  requireAuthenticatedUser(req);
  // TODOs:
  // * support moving tiddlers between bags (write to different bag than which it came from).
  const wiki = req.params.wiki;
  const revision = req.query.revision;
  const tiddler = readIncomingTiddler(
    Object.assign({}, req.body, {revision}) as HTTPSerializedTiddler,
    req.user,
    context.getTimestamp);
  const role = getUserRole(wiki, req.user);
  if (tiddler.title !== req.params.title) {
    throw new HTTPError(`mismatch between tiddler titles in URL and request body`, HTTP_BAD_REQUEST);
  }
  if (req.params.bag && tiddler.bag && req.params.bag !== tiddler.bag) {
    throw new HTTPError(`tiddler's bag attributes (${tiddler.bag}) and bag name in URL (${req.params.bag}) do not match`, HTTP_BAD_REQUEST);
  }
  return context.runTransaction(async transaction => {
      const bags = await (req.params.bag ? [req.params.bag] : resolveRecipe(context, transaction, wiki, req.params.recipe, req.user));
      const acceptingBags = await bagsWithAccess(context, transaction, wiki, bags, role, req.user, ACCESS_WRITE, tiddler);
      if (acceptingBags.length < 1) {
        throw new HTTPError(`no ${ACCESS_WRITE} access granted to ${username(req.user!)} with role ${role} on wiki ${wiki} ${req.params.recipe ? "recipe " + req.params.recipe : "bag " + req.params.bag} ${tiddler ? "tiddler " + JSON.stringify(tiddler) : ""}`, HTTP_FORBIDDEN);
      }
      const destinationBag = acceptingBags[0];
      const updatedTiddler = await writeTiddler(context, transaction, req.user, wiki, destinationBag, tiddler);
      return {bag: destinationBag, revision: updatedTiddler.revision};
  }).then(
      res.json.bind(res),
      err => sendErr(res, err));
};

const mkRemove = (context:Context):Handler => (req:express.Request, res:express.Response) => {
    // not prepared for anonymous users yet
    requireAuthenticatedUser(req);
    const wiki = req.params.wiki;
    const bag = req.params.bag;
    const title = req.params.title;
    const revision = req.query.revision;
    const role = getUserRole(wiki, req.user);
    return context.runTransaction(async transaction => {
            if (!(await hasAccess(context, transaction, wiki, bag, role, req.user, ACCESS_WRITE))) {
                throw new HTTPError(`No ${ACCESS_WRITE} access granted for remove operation to ${username(req.user!)} with role ${role} on wiki ${wiki} bag ${bag} tiddler ${title}`, HTTP_FORBIDDEN);
            }
            await removeTiddler(context, transaction, wiki, bag, title, revision);
            return {};
    }).then(
        res.json.bind(res),
        err => sendErr(res, err));
};

export const getEndpoints = (context:Context) => {
    return {
        read: mkRead(context),
        write: mkWrite(context),
        remove: mkRemove(context)
    };
};
