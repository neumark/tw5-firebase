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

// Should we include a device-specfic ID in the revision?
const getRevision = (email, timestamp) => `${stringifyDate(timestamp)}:${email}`

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

const getBagRef = (wiki, bag) => db.collection(`wikis/${wiki}/${bag}`);

const getTiddlerRef = (wiki, bag, title) => getBagRef(wiki, bag).doc(tiddlerTitleToFirebaseDocName(title));

const PERSONAL_TIDDLERS = ['$:/StoryList', '$:/HistoryList', '$:/DefaultTiddlers'].map(tiddlerTitleToFirebaseDocName);

const isDraftTiddler = tiddler => tiddler.fields && tiddler.fields['draft.of'];

const isPersonalTiddler = tiddler => PERSONAL_TIDDLERS.includes(tiddlerTitleToFirebaseDocName(tiddler.title));

const isSystemTiddler = tiddler => tiddlerTitleToFirebaseDocName(tiddler.title).startsWith(tiddlerTitleToFirebaseDocName('$:/'));

const GLOBAL_BAG = "global";

const personalBag = email => tiddlerTitleToFirebaseDocName(`user:${email}`)

const ROLES_TIDDLER = "$:/config/firestore-syncadaptor-client/roles";

const ROLES = {
    admin: 3,
    editor: 2,
    reader: 1,
    none: 0
};

const getUserRole = async (transaction, wiki, email) => {
    const doc = await transaction.get(getTiddlerRef(wiki, GLOBAL_BAG, ROLES_TIDDLER));
    if (!doc.exists) {
        // default is admin role if no roles tiddler found
        return ROLES.admin;
    }
    const usersToRolls = JSON.parse(doc.data().text);
    return Math.max(...(Object.entries(usersToRolls).map(([role, users]) => users.includes(email) ? (ROLES[role] || 0) : ROLES.none)));
};

const getBagForWrite = (wiki, email, role, tiddler) => {
    if (role === ROLES.none) {
        throw new HTTPError(`no write access is granted to ${email}`, HTTP_FORBIDDEN);
    }
    if (isDraftTiddler(tiddler) || isPersonalTiddler(tiddler) || (role < ROLES.admin && isSystemTiddler(tiddler))) {
        return personalBag(email);
    }
    return GLOBAL_BAG;
};


const prepareTiddler = (email, doc, tiddler) => {
      const timestamp = new Date();
      const newRevision = getRevision(email, timestamp);
      return Object.assign({}, tiddler, {
            creator: doc.exists ? doc.data().creator : email,
            modifier: email,
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


app.use(cors({origin: true}));
app.use(validateFirebaseIdToken);

app.get('/:wiki/all', (req, res) => {
  const wiki = req.params.wiki;
  const email = req.user.email;
  const revisionOnly = req.query.revisionOnly === 'true'; 
  return db.runTransaction(async transaction => {
      const role = await getUserRole(transaction, wiki, email);
      if (role === ROLES.none) {
          throw new HTTPError(`no read access is granted to ${email}`, HTTP_FORBIDDEN);
      }
      // personal bag overrides global bag
      const allTiddlers = [];
      const titles = {};
      const addTiddlerIfNotDuplicate = doc => {
          const tiddler = doc.data();
          if (!titles.hasOwnProperty(tiddler.title)) {
              titles[tiddler.title] = true;
              allTiddlers.push(fixDates(tiddler));
          }
      }
      (await getBagRef(wiki, personalBag(email)).get()).forEach(addTiddlerIfNotDuplicate);
      (await getBagRef(wiki, GLOBAL_BAG).get()).forEach(addTiddlerIfNotDuplicate);
      return allTiddlers;
  }).then(
      tiddlers => res.json(tiddlers),
      err => sendErr(res, err));
});

app.put('/:wiki/save', (req, res) => {
  // TODOs:
  // * ajv schema for tiddler?
  // * DONE: override username, timestamp for tiddler
  // * DONE: Don't allow save if there is a revision conflict (make saving atomic in transaction).
  // * DONE: compute and return new revision based on tiddler, user
  // * DONE: save per-user tiddlers in the 'peruser' collection (StoryList, drafts) - only latest version.
  // * DONE: return new revision of tiddler.
  const wiki = req.params.wiki;
  const tiddler = req.body;
  const revision = tiddler.revision;
  const email = req.user.email;
  return db.runTransaction(async transaction => {
      const role = await getUserRole(transaction, wiki, email);
      const bag = getBagForWrite(wiki, email, role, tiddler);
      const tiddlerRef = getTiddlerRef(wiki, bag, tiddler.title);
      const doc = await transaction.get(tiddlerRef);
      // personal tiddler's don't need revision checking - solves the bug where $:/StoryList is saved before it's read.
      if (!isPersonalTiddler(tiddler)) {
        revisionCheck(doc, revision);
      }
      const updatedTiddler = prepareTiddler(email, doc, tiddler);
      await transaction.set(tiddlerRef, updatedTiddler);
      return updatedTiddler.revision;
  }).then(
      revision => res.send(JSON.stringify({revision})),
      err => sendErr(res, err));
});

app.delete('/:wiki/:title', async (req, res) => {
    const title = req.params.title;
    const wiki = req.params.wiki;
    const email = req.user.email;
    const revision = req.query.revision;
    try {
        await db.runTransaction(async transaction => {
            const role = await getUserRole(transaction, wiki, email);
            if (role === ROLES.none) {
                throw new HTTPError(`no delete access is granted to ${email}`, HTTP_FORBIDDEN);
            }
            // A tiddler should only be written to the global or a user's personal bag, but we don't know which one
            // based on just the title. So let's try to delete from both bags if we have permission. The revision passed
            // will of course apply to one, but that's OK, because revisionCheck is happy if it finds no existing tiddler.
            // Firestore requires all reads to be preformed before all writes, hence the ordering.
            const globalTiddlerRef = getTiddlerRef(wiki, GLOBAL_BAG, title);
            let globalDoc = null;
            const personalTiddlerRef = getTiddlerRef(wiki, personalBag(email), title);
            let personalDoc = null;
            if (role === ROLES.admin) {
                globalDoc = await transaction.get(globalTiddlerRef);
                revisionCheck(globalDoc, revision);
            }
            if (role > ROLES.reader) {
                personalDoc = await transaction.get(personalTiddlerRef);
                revisionCheck(personalDoc, revision);
            }
            if (globalDoc) {
                await transaction.delete(globalTiddlerRef);
            }
            if (personalDoc) {
                await transaction.delete(personalTiddlerRef);
            }
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
