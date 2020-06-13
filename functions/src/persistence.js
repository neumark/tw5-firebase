const admin = require('firebase-admin');
const { HTTP_CONFLICT, HTTPError } = require('./errors');
const { stringifyDate, getRevision } = require('./tw');

const db = admin.firestore();

// converts firestore dates to string timestamps in tiddler fields
const fixDates = tiddler => Object.assign({}, tiddler, {
      created: stringifyDate(tiddler.created.toDate()),
      modified: stringifyDate(tiddler.modified.toDate())
});

// Note: theoretically, tiddlers with different titles could be considered the same due to this transformation.
const stringToFirebaseDocName = str => str.replace(/\//g, "_");

const getBagRef = (wiki, bag) => db.collection(`wikis/${stringToFirebaseDocName(wiki)}/${stringToFirebaseDocName(bag)}`);

const getTiddlerRef = (wiki, bag, title) => getBagRef(wiki, bag).doc(stringToFirebaseDocName(title));

const prepareTiddler = (email, doc, tiddler) => {
    const timestamp = new Date();
    const newRevision = getRevision(email, timestamp);
    const newTiddler = Object.assign({}, tiddler, {
        creator: doc.exists ? doc.data().creator : email,
        modifier: email,
        created: doc.exists ? doc.data().created : admin.firestore.Timestamp.fromDate(timestamp),
        modified: admin.firestore.Timestamp.fromDate(timestamp),
        revision: newRevision
    });
    delete newTiddler.bag;
    return newTiddler;
};

const revisionCheck = (doc, revision) => {
    if (doc.exists && doc.data().revision !== revision) {
        throw new HTTPError(`revision conflict: current is ${doc.data().revision}, received update to ${revision}`, HTTP_CONFLICT);
    }
};

const asyncMap = async (list, fn) => await Promise.all(list.map(fn));

const readBags = async (transaction, wiki, bags) => {
    const allTiddlers = [];
    const titles = new Set();
    (await asyncMap(bags, async bag => ({bag, bagContents: await transaction.get(getBagRef(wiki, bag))}))).forEach(({bag, bagContents}) => {
        bagContents.forEach(doc => {
            const tiddler = doc.data();
            if (!titles.has(tiddler.title)) {
                titles.add(tiddler.title);
                allTiddlers.push(Object.assign(fixDates(tiddler), {bag}));
            }
          });
    });
    return allTiddlers;
};

const firstOrNull = list => list.length > 0 ? list[0] : null;

const readTiddler = async (transaction, wiki, bags, title) => {
    const maybeDocs = await asyncMap(bags, async bag => ({bag, doc: await transaction.get(getTiddlerRef(wiki, bag, title))}));
    return firstOrNull(maybeDocs
        // only consider docs which exist in firestore
        .filter(({doc}) => doc.exists)
        // we only need the first one
        .slice(0,1)
        // make it into a serializable tiddler
        .map(({bag, doc}) => Object.assign(fixDates(doc.data()), {bag})));
};

const writeTiddler = async (transaction, email, wiki, bag, tiddler, revision) => {
    const tiddlerRef = getTiddlerRef(wiki, bag, tiddler.title);
    const doc = await transaction.get(tiddlerRef);
    revisionCheck(doc, revision);
    const updatedTiddler = prepareTiddler(email, doc, tiddler);
    await transaction.set(tiddlerRef, updatedTiddler);
    return updatedTiddler;
};

const removeTiddler = async (transaction, wiki, bag, title, revision) => {
    const tiddlerRef = getTiddlerRef(wiki, bag, title);
    const doc = await transaction.get(tiddlerRef);
    revisionCheck(doc, revision);
    await transaction.delete(tiddlerRef);
};

const runTransaction = fn => db.runTransaction(fn);

module.exports = {runTransaction, readBags, readTiddler, removeTiddler, writeTiddler};
