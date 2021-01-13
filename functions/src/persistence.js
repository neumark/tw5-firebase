const { HTTP_CONFLICT, HTTPError } = require('./errors');
const { stringifyDate, getRevision } = require('./tw');
const { getTimestamp } = require('./date');
const { getValidator } = require('./schema');

// converts firestore dates to string timestamps in tiddler fields
const fixDates = tiddler => Object.assign({}, tiddler, {
      created: stringifyDate(tiddler.created.toDate()),
      modified: stringifyDate(tiddler.modified.toDate())
});

// Note: theoretically, tiddlers with different titles could be considered the same due to this transformation.
const stringToFirebaseDocName = str => str.replace(/\//g, "_");

const getBagRef = (db, wiki, bag) => db.collectionRef(`wikis/${stringToFirebaseDocName(wiki)}/${stringToFirebaseDocName(bag)}`);

const getTiddlerRef = (db, wiki, bag, title) => getBagRef(db, wiki, bag).doc(stringToFirebaseDocName(title));

const prepareTiddler = (db, email, doc, tiddler) => {
    const timestamp = getTimestamp();
    const firestoreTS = db.dateToFirestoreTimestamp(timestamp);
    const newRevision = getRevision(email, timestamp);
    const newTiddler = Object.assign({}, tiddler, {
        creator: doc.exists ? doc.data().creator : email,
        modifier: email,
        created: doc.exists ? doc.data().created : firestoreTS,
        modified: firestoreTS,
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

const readBags = async (db, transaction, wiki, bags) => {
    const allTiddlers = [];
    const titles = new Set();
    (await asyncMap(bags, async bag => ({bag, bagContents: await transaction.get(getBagRef(db, wiki, bag))}))).forEach(({bag, bagContents}) => {
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

const firstOrFallback = (list, fallback) => list.length > 0 ? list[0] : fallback;

const readTiddler = async (db, transaction, wiki, bags, title) => {
    const maybeDocs = await asyncMap(bags, async bag => ({bag, doc: await transaction.get(getTiddlerRef(db, wiki, bag, title))}));
    return firstOrFallback(maybeDocs
        // only consider docs which exist in firestore
        .filter(({doc}) => doc.exists)
        // we only need the first one
        .slice(0,1)
        // make it into a serializable tiddler
        .map(({bag, doc}) => Object.assign(fixDates(doc.data()), {bag})), null);
};

// validates the "text" field of a tiddler against a schema.
const getContentValidatingReader = (schema) => {
    const validate = getValidator(schema);
    return async (db, transaction, wiki, bag, title, fallbackValue={}) => {
        const tiddler = await readTiddler(db, transaction, wiki, [bag], title);
        const value = (tiddler && tiddler.text) ? JSON.parse(tiddler.text) : fallbackValue;
        const validation = validate(value)
        if (!validation.valid) {
            throw new Error(`tiddler does not conform to schema: ${JSON.stringify(validation.errors)}`);
        }
        return value;
    };
};

const writeTiddler = async (db, transaction, email, wiki, bag, tiddler) => {
    const revision = tiddler.revision;
    const tiddlerRef = getTiddlerRef(db, wiki, bag, tiddler.title);
    const doc = await transaction.get(tiddlerRef);
    revisionCheck(doc, revision);
    const updatedTiddler = prepareTiddler(db, email, doc, tiddler);
    await transaction.set(tiddlerRef, updatedTiddler);
    return updatedTiddler;
};

const removeTiddler = async (db, transaction, wiki, bag, title, revision) => {
    const tiddlerRef = getTiddlerRef(db, wiki, bag, title);
    const doc = await transaction.get(tiddlerRef);
    revisionCheck(doc, revision);
    await transaction.delete(tiddlerRef);
};

module.exports = {readBags, readTiddler, removeTiddler, writeTiddler, getContentValidatingReader};
