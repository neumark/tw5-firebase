import 'source-map-support/register'
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import * as express from 'express';
import cors from 'cors';
import helmet from "helmet";
import {getDB, DB} from './api/db';
import {validateFirebaseIdToken } from './api/authentication';
import {getEndpoints} from './api/endpoints';

admin.initializeApp();
const db = getDB(() => admin.firestore());

const { read, write, remove } = getEndpoints(db);
// TODO: const config = require('../../etc/config.json');
const apiRegion = "europe-west3" // config.deploy.apiRegion;


const restapi = express.default();
restapi.use(helmet());
restapi.use(cors({origin: true}));
restapi.use(validateFirebaseIdToken(admin.auth));

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

restapi.get('/:wiki/recipes/:recipe/tiddlers/:title?', read as any);
restapi.get('/:wiki/bags/:bag/tiddlers/:title?', read as any);
restapi.put('/:wiki/recipes/:recipe/tiddlers/:title', write as any);
restapi.put('/:wiki/bags/:bag/tiddlers/:title', write as any);
restapi.delete('/:wiki/bags/:bag/tiddlers/:title', remove as any);

export const wiki = functions.region(apiRegion).https.onRequest(restapi);
