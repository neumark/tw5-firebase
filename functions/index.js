'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
const express = require('express');
const cors = require('cors');
const app = express();
const {isDate, parseDate, pad, stringifyDate, fixDates} = require('./twutils');

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

const PERSONAL_TAG = "personal";

const isDraftTiddler = tiddler => tiddler.fields && tiddler.fields['draft.of'];

const isPersonalTiddler = tiddler => PERSONAL_TIDDLERS.includes(tiddlerTitleToFirebaseDocName(tiddler.title)) || (tiddler.tags && tiddler.tags.includes(PERSONAL_TAG));

const TIDDLER_TYPE = "text/vnd.tiddlywiki";
const SYSTEM_TITLE_PREFIX = "$:/";

const isSystemTiddler = tiddler => tiddlerTitleToFirebaseDocName(tiddler.title).startsWith(tiddlerTitleToFirebaseDocName(SYSTEM_TITLE_PREFIX)) || (tiddler.type && tiddler.type !== TIDDLER_TYPE);

const GLOBAL_CONTENT_BAG = "content";

const GLOBAL_SYSTEM_BAG = "system";

const personalBag = email => tiddlerTitleToFirebaseDocName(`user:${email}`)

const applicableBags = email => ([personalBag(email), GLOBAL_SYSTEM_BAG, GLOBAL_CONTENT_BAG]);

const ROLES_TIDDLER = "$:/config/firestore-syncadaptor-client/roles";

const ROLES = {
    admin: 3,
    editor: 2,
    reader: 1,
    none: 0
};

const getUserRole = async (transaction, wiki, email) => {
    const doc = await transaction.get(getTiddlerRef(wiki, GLOBAL_SYSTEM_BAG, ROLES_TIDDLER));
    if (!doc.exists) {
        // default is admin role if no roles tiddler found
        return ROLES.admin;
    }
    const usersToRolls = JSON.parse(doc.data().text);
    return Math.max(...(Object.entries(usersToRolls).map(([role, users]) => users.includes(email) ? (ROLES[role] || 0) : ROLES.none)));
};

const getBagForWrite = (wiki, email, role, tiddler) => {
    // personal tiddler - anybody with a role can write to their personal bag
    if (role >= ROLES.reader && (isDraftTiddler(tiddler) || isPersonalTiddler(tiddler))) {
        return personalBag(email);
    }
    // non personal tiddlers are either global content or system tiddlers, editors can write the former, but...
    if (role >= ROLES.editor && !isSystemTiddler(tiddler)) {
        return GLOBAL_CONTENT_BAG;
    }
    // ... only admins can write the later.
    if (role === ROLES.admin) {
        return GLOBAL_SYSTEM_BAG;
    }
    throw new HTTPError(`no write access granted to ${email}`, HTTP_FORBIDDEN);
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

const readBags = async (transaction, wiki, bags) => {
    const allTiddlers = [];
    const titles = {};
    for (let bag of bags) {
        const bagContents = await transaction.get(getBagRef(wiki, bag));
        bagContents.forEach(doc => {
            const tiddler = doc.data();
            if (!titles.hasOwnProperty(tiddler.title)) {
                titles[tiddler.title] = true;
                allTiddlers.push(Object.assign(fixDates(tiddler), {bag}));
            }
          });
    }
    return allTiddlers;
};

const readTiddler = async (transaction, wiki, bags, title) => {
    for (let bag of bags) {
        const doc = await transaction.get(getTiddlerRef(wiki, bag, title));
        if (doc.exists) {
            return Object.assign(fixDates(doc.data()), {bag});
        }
    }
    return null;
};

app.use(cors({origin: true}));
app.use(validateFirebaseIdToken);

app.get('/:wiki/recipes/default/tiddlers/:title?', (req, res) => {
  const wiki = req.params.wiki;
  const title = req.params.title;
  const email = req.user.email;
  return db.runTransaction(async transaction => {
      const role = await getUserRole(transaction, wiki, email);
      if (role < ROLES.reader) {
          throw new HTTPError(`no read access is granted to ${email}`, HTTP_FORBIDDEN);
      }
      // personal bag overrides global bag
      const bags = applicableBags(email);
      return title ? readTiddler(transaction, wiki, bags, title) : readBags(transaction, wiki, bags); 
  }).then(
      res.json.bind(res),
      err => sendErr(res, err));
});

app.put('/:wiki/recipes/default/tiddlers/:title', (req, res) => {
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
  if (tiddler.title !== req.params.title) {
      return sendErr(res, new HTTPError(`mismatch between tiddler titles in URL and PUT body`, HTTP_FORBIDDEN));
  }
  return db.runTransaction(async transaction => {
      const role = await getUserRole(transaction, wiki, email);
      const bag = getBagForWrite(wiki, email, role, tiddler);
      const tiddlerRef = getTiddlerRef(wiki, bag, tiddler.title);
      const doc = await transaction.get(tiddlerRef);
      // personal tiddler's don't need revision checking - solves the bug where $:/StoryList is saved before it's read.
      // TODO: the real solution is to preload these tiddlers.
      if (!isPersonalTiddler(tiddler)) {
        revisionCheck(doc, revision);
      }
      const updatedTiddler = prepareTiddler(email, doc, tiddler);
      await transaction.set(tiddlerRef, updatedTiddler);
      return {bag, revision: updatedTiddler.revision};
  }).then(
      res.json.bind(res),
      err => sendErr(res, err));
});

// TODO: don't allow deletion of a tiddler the user doesn't have write access to.
app.delete('/:wiki/bags/:bag/tiddlers/:title', async (req, res) => {
    const email = req.user.email;
    const wiki = req.params.wiki;
    const bag = req.params.bag;
    const title = req.params.title;
    const revision = req.query.revision;
    try {
        await db.runTransaction(async transaction => {
            const role = await getUserRole(transaction, wiki, email);
            if ((role < ROLES.reader) ||
                ((role < ROLES.editor) && (bag === GLOBAL_CONTENT_BAG)) ||
                ((role < ROLES.admin) && (bag === GLOBAL_SYSTEM_BAG)) ||
                !applicableBags(email).includes(bag)) {
                throw new HTTPError(`no delete access is granted to ${email}`, HTTP_FORBIDDEN);
            }
            const tiddlerRef = getTiddlerRef(wiki, bag, title);
            const doc = await transaction.get(tiddlerRef);
            revisionCheck(doc, revision);
            await transaction.delete(tiddlerRef);
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
