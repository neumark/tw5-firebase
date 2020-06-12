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

restapi.get('/:wiki/recipes/default/tiddlers/:title?', read);
restapi.put('/:wiki/recipes/default/tiddlers/:title', write);
restapi.delete('/:wiki/bags/:bag/tiddlers/:title', remove);

exports.wiki = {app: functions.region('europe-west3').https.onRequest(restapi)};
