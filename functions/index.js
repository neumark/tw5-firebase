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

const globalTiddlersCollection = wikiName => db.collection('wikis').doc(wikiName).collection('tiddlers');

const peruserTiddlersCollection = (wikiName, email) => db.collection('wikis').doc(wikiName).collection('peruser').doc(email).collection('tiddlers');

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
const HTTP_FORBIDDEN = 403;

const sendErr = (res, err) => res.status(err.statusCode || 500).json({message: err.message, stack: err.stack});

const PERUSER_TIDDLERS = ['$:/StoryList'];

const isPerUserTiddler = tiddler => PERUSER_TIDDLERS.includes(tiddler.title) || (tiddler.fields && tiddler.fields['draft.of']);

const getAllTiddlers = async (wiki, user) => {
    const globalSnapshot = await globalTiddlersCollection(wiki).get();
    const perUserSnapshot = await peruserTiddlersCollection(wiki, user.email).get();
    const result = [];
    globalSnapshot.forEach(doc => result.push(doc.data()));
    perUserSnapshot.forEach(doc => result.push(doc.data()));
    return result;
};


const prepareTiddler = (user, doc, tiddler) => {
      const timestamp = new Date();
      const newRevision = getRevision(user, timestamp);
      return Object.assign({}, tiddler, {
            creator: doc.exists ? doc.data().creator : user.email,
            modifier: user.email,
            created: doc.exists ? doc.data().created : admin.firestore.Timestamp.fromDate(timestamp),
            modified: admin.firestore.Timestamp.fromDate(timestamp),
            revision: newRevision
      });
};

const revisionCheck = (doc, revision) => {
    if (doc.exists && doc.data().revision !== revision) {
        throw new HTTPError(`revision conflict: current is ${doc.data().revision}, received update to ${revision}`, HTTP_CONFLICT);
    }
};

const ACCESS_TIDDLER = "$:/config/firestore-syncadaptor-client/access";
const ACCESS_FIELDS = {
    // format is: ACCESS_TYPE: [list of permissions which provide this access]
    "write": ["write"],
    "read": ["read", "write"],
};

const accessCheck = async (transaction, wiki, email, accessType) => {
    const tiddlerRef = globalTiddlersCollection(wiki).doc(tiddlerTitleToFirebaseDocName(ACCESS_TIDDLER));
    const doc = await transaction.get(tiddlerRef);
    // if no access rights doc, any authenticated user can write to global tiddlers.
    if (!doc.exists) {
        return;
    }
    const accessRights = JSON.parse(doc.data().text);
    const hasAccess = ACCESS_FIELDS[accessType].map(at => (accessRights[at] || []).includes(email)).some(x => x);
    if (!hasAccess) {
        throw new HTTPError(`no ${accessType} access is granted to ${email}`, HTTP_FORBIDDEN);
    }
};

const withGlobalTiddlerWriteCheck = (user, wiki, title, revision, writeAction) => {
  const tiddlerRef = globalTiddlersCollection(wiki).doc(tiddlerTitleToFirebaseDocName(title));
  return db.runTransaction(async transaction => {
      await accessCheck(transaction, wiki, user.email, "write");
      const doc = await transaction.get(tiddlerRef);
      revisionCheck(doc, revision);
      return writeAction(transaction, tiddlerRef, doc);
  });
};

const saveGlobalTiddler = (user, wiki, tiddler) => withGlobalTiddlerWriteCheck(user, wiki, tiddler.title, tiddler.revision,
      async (transaction, tiddlerRef, doc) => {
        const updatedTiddler = prepareTiddler(user, doc, tiddler);
        await transaction.set(tiddlerRef, updatedTiddler);
        return updatedTiddler.revision;
      });

const savePerUserTiddler = (user, wiki, tiddler) => {
  const tiddlerRef = peruserTiddlersCollection(wiki, user.email).doc(tiddlerTitleToFirebaseDocName(tiddler.title));
  return db.runTransaction(async transaction => {
      // anyone who can read the wiki should be able to write preuser tiddlers (to save things like StoryList).
      await accessCheck(transaction, wiki, user.email, "read");
      const doc = await transaction.get(tiddlerRef);
      // silently ignore revision mismatch
      const updatedTiddler = prepareTiddler(user, doc, tiddler);
      await transaction.set(tiddlerRef, updatedTiddler);
      return updatedTiddler.revision;
  });
};

app.use(cors({origin: true}));
app.use(validateFirebaseIdToken);

app.get('/:wiki/all', (req, res) => {
  const mapTiddler = req.query.revisionOnly ? ({title, revision}) => ({title, revision}) : fixDates;
  return getAllTiddlers(req.params.wiki, req.user).then(
      tiddlers => res.send(JSON.stringify(tiddlers.map(mapTiddler))),
      error => sendErr(res, err));
});

app.put('/:wiki/save', (req, res) => {
  // TODOs:
  // * ajv schema for tiddler?
  // * DONE: override username, timestamp for tiddler
  // * DONE: Don't allow save if there is a revision conflict (make saving atomic in transaction).
  // * DONE: compute and return new revision based on tiddler, user
  // * DONE: save per-user tiddlers in the 'peruser' collection (StoryList, drafts) - only latest version.
  // * save global tiddler to versions collection as well.
  // * DONE: return new revision of tiddler.

  const wiki = req.params.wiki;
  const tiddler = req.body;
  const transaction = isPerUserTiddler(tiddler) ? savePerUserTiddler(req.user, wiki, tiddler) : saveGlobalTiddler(req.user, wiki, tiddler);
  return transaction.then(
      revision => res.send(JSON.stringify({revision})),
      err => sendErr(res, err));
});

app.delete('/:wiki/:title', async (req, res) => {
    const dbTitle = tiddlerTitleToFirebaseDocName(req.params.title);
    const wiki = req.params.wiki;
    try {
        await withGlobalTiddlerWriteCheck(req.user, wiki, req.params.title, req.query.revision,
            async (transaction, tiddlerRef, doc) => {
                // only delete global tiddler if write checks OK
                await transaction.delete(tiddlerRef);
                // delete per user tiddler if it exists
                await transaction.delete(
                    peruserTiddlersCollection(wiki, req.user.email).doc(
                        tiddlerTitleToFirebaseDocName(req.params.title)));
            });
        res.status(200).json({});
    } catch (err) {
        sendErr(res, err);
    }
});

// This HTTPS endpoint can only be accessed by your Firebase Users.
// Requests need to be authorized by providing an `Authorization` HTTP header
// with value `Bearer <Firebase ID Token>`.
exports.wiki = {app: functions.region('europe-west3').https.onRequest(app)};
