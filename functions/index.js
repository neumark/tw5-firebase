/**
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
const express = require('express');
const cors = require('cors');
const app = express();

// Express middleware that validates Firebase ID Tokens passed in the Authorization HTTP header.
// The Firebase ID token needs to be passed as a Bearer token in the Authorization HTTP header like this:
// `Authorization: Bearer <Firebase ID Token>`.
// when decoded successfully, the ID Token content will be added as `req.user`.
const validateFirebaseIdToken = async (req, res, next) => {

  if ((!req.headers.authorization || !req.headers.authorization.startsWith('Bearer '))) {
    console.error('No Firebase ID token was passed as a Bearer token in the Authorization header.',
        'Make sure you authorize your request by providing the following HTTP header:',
        'Authorization: Bearer <Firebase ID Token>');
    res.status(403).send('Unauthorized');
    return;
  }

  if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
      res.status(403).send('Unauthorized');
      return;
  } 
  // Read the ID Token from the Authorization header.
  const idToken = req.headers.authorization.split('Bearer ')[1];

  try {
    const decodedIdToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedIdToken;
    next();
    return;
  } catch (error) {
    console.error('Error while verifying Firebase ID token:', error);
    res.status(403).send('Unauthorized');
    return;
  }
};

const db = admin.firestore();

// Note: theoretically, tiddlers with different titles could be considered the same due to this transformation.
// Not worth fixing at this point
const tiddlerTitleToFirebaseDocName = (tiddlerTitle) => tiddlerTitle.replace(/\//g, "_");

const isDate = value => Object.prototype.toString.call(value) === "[object Date]";

const parseDate = value => {
	if(typeof value === "string") {
		return new Date(Date.UTC(parseInt(value.substr(0,4),10),
				parseInt(value.substr(4,2),10)-1,
				parseInt(value.substr(6,2),10),
				parseInt(value.substr(8,2)||"00",10),
				parseInt(value.substr(10,2)||"00",10),
				parseInt(value.substr(12,2)||"00",10),
				parseInt(value.substr(14,3)||"000",10)));
	} else if($tw.utils.isDate(value)) {
		return value;
	} else {
		return null;
	}
}

const pad = (num, length = 2) => num.toString().padStart(length, "0");

const stringifyDate = value => value.getUTCFullYear() +
			pad(value.getUTCMonth() + 1) +
			pad(value.getUTCDate()) +
			pad(value.getUTCHours()) +
			pad(value.getUTCMinutes()) +
			pad(value.getUTCSeconds()) +
			pad(value.getUTCMilliseconds(),3);

const fixDates = tiddler => Object.assign({}, tiddler, {
      created: stringifyDate(tiddler.created.toDate()),
      modified: stringifyDate(tiddler.modified.toDate())
});

const getTiddlersCollection = () => db.collection('wikis').doc('pn-wiki').collection('tiddlers');

app.use(cors({origin: true}));
app.use(validateFirebaseIdToken);
app.get('/all', (req, res) => {
  // add per-user tiddlers also
  return getTiddlersCollection().get().then(snapshot => {
            var result = [];
            snapshot.forEach(doc => result.push(fixDates(doc.data())));
            return result;
  }).then(tiddlers => res.send(JSON.stringify(tiddlers)));
});

// Should we include a device-specfic ID in the revision?
const getRevision = (user, timestamp) => `${stringifyDate(timestamp)}:${user.email}`

class HTTPError extends Error {
    constructor(message, statusCode = 500) {
        super(message)
        Error.captureStackTrace(this, HTTPError);
        this.statusCode = statusCode;
    }
}

const HTTP_CONFLICT = 409;

app.put('/save', (req, res) => {
  const tiddler = req.body;
  // TODOs:
  // * ajv schema for tiddler
  // * override username, timestamp for tiddler
  // * Don't allow save if there is a revision conflict (make saving atomic in transaction).
  // * compute and return new revision based on tiddler, user, device
  // * save per-user tiddlers in the 'peruser' collection (StoryList, drafts) - only latest version.
  // * save global tiddler to versions collection as well.
  // * return new revision of tiddler.
  const dbTitle = tiddlerTitleToFirebaseDocName(tiddler.title);
  const tiddlerRef = getTiddlersCollection().doc(dbTitle);
  let transaction = db.runTransaction(async t => {
      const lastRevision = tiddler.revision;
      const doc = await t.get(tiddlerRef)
      if (doc.exists && doc.data().revision !== lastRevision) {
        throw new HTTPError(`revision conflict: current is ${doc.data().revision}, received update to ${lastRevision}`, HTTP_CONFLICT);
      }
      const timestamp = new Date();
      const newRevision = getRevision(req.user, timestamp);
      const updatedTiddler = Object.assign({}, tiddler, {
            creator: doc.exists ? doc.data().creator : req.user.email,
            modifier: req.user.email,
            created: doc.exists ? doc.data().created : admin.firestore.Timestamp.fromDate(timestamp),
            modified: admin.firestore.Timestamp.fromDate(timestamp),
            revision: newRevision
      });
      delete updatedTiddler.lastRevision;
      await t.set(tiddlerRef, updatedTiddler);
      return newRevision;
  }).then(revision => res.send(JSON.stringify({revision}))).catch(err => {
    console.error('Transaction failure:', err);
    throw err;
  });
});

// global error handler:
// app.use((err, req, res, next) => err ? res.status(err.statusCode || 500).json({message: err.message, stack: err.stack}) : next());

// This HTTPS endpoint can only be accessed by your Firebase Users.
// Requests need to be authorized by providing an `Authorization` HTTP header
// with value `Bearer <Firebase ID Token>`.
exports.wiki = {app: functions.region('europe-west3').https.onRequest(app)};
