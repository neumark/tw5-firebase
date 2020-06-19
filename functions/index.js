'use strict';

const admin = require('firebase-admin');
admin.initializeApp();

const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const { validateFirebaseIdToken } = require('./src/authentication');
const { read, write, remove } = require('./src/endpoints');

const restapi = express();

restapi.use(cors({origin: true}));
restapi.use(validateFirebaseIdToken(admin));

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

restapi.get('/:wiki/recipes/:recipe/tiddlers/:title?', read);
restapi.put('/:wiki/recipes/:recipe/tiddlers/:title', write);
restapi.delete('/:wiki/bags/:bag/tiddlers/:title', remove);

exports.wiki = {app: functions.region('europe-west3').https.onRequest(restapi)};
