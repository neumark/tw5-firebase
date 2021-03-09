import * as admin from 'firebase-admin';
import { Schema } from 'ajv';
import { FirestoreSerializedTiddler } from 'src/model/tiddler';
import { getValidator } from '../common/schema';
import { username } from './authentication';
import { DB } from './db';
import { HTTPError, HTTP_BAD_REQUEST, HTTP_CONFLICT, HTTP_FORBIDDEN } from './errors';
import { getRevision } from './tw';
import { User } from './user';
import { HttpsError } from 'firebase-functions/lib/providers/https';

const dateToFirestoreTimestamp = (date:Date) => admin.firestore.Timestamp.fromDate(date);

// Note: theoretically, tiddlers with different titles could be considered the same due to this transformation.
const stringToFirebaseDocName = (str:string) => str.replace(/\//g, "_");

const getBagRef = (db:DB, wiki:string, bag:string) => db.collectionRef(`wikis/${stringToFirebaseDocName(wiki)}/bags/${stringToFirebaseDocName(bag)}/tiddlers`);

const getTiddlerRef = (db:DB, wiki:string, bag:string, title:string) => getBagRef(db, wiki, bag).doc(stringToFirebaseDocName(title));

const prepareTiddler = (db:DB, user:User, currentVersion:FirestoreSerializedTiddler, previousVersion?:FirestoreSerializedTiddler):FirestoreSerializedTiddler => {
    const timestamp = db.getTimestamp();
    const firestoreTS = dateToFirestoreTimestamp(timestamp);
    const newRevision = getRevision(user, timestamp);
    const modifier = username(user);
    const newTiddler = Object.assign({}, currentVersion, {
        creator: previousVersion ? previousVersion.creator : modifier,
        modifier,
        created: previousVersion ? previousVersion.created : firestoreTS,
        modified: firestoreTS,
        revision: newRevision
    });
    return newTiddler;
};

const revisionCheck = (existingTiddler:FirestoreSerializedTiddler, revision:string) => {
    if (existingTiddler.revision !== revision) {
        throw new HTTPError(`revision conflict: current is ${existingTiddler.revision}, received update to ${revision}`, HTTP_CONFLICT);
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
                allTiddlers.push(Object.assign(deserializeTiddler(tiddler), {bag}));
            }
          });
    });
    return allTiddlers;
};

const firstOrFallback = <T> (list:T[], fallback:T|null=null) => list.length > 0 ? list[0] : fallback;

/**
 * Attempts to read the tiddler with the given title from a number of bags, returns first one with a result.
 * @param db
 * @param transaction
 * @param wiki
 * @param bags
 * @param title
 * @returns
 */
const readTiddler = async (db:DB, transaction:FirebaseFirestore.Transaction, wiki:string, bags:string[], title:string):Promise<{bag: string, tiddler: FirestoreSerializedTiddler}|null> => {
    const maybeDocs = await transaction.getAll(...bags.map(bag => getTiddlerRef(db, wiki, bag, title)));
    return firstOrFallback(maybeDocs
        .map((doc, ix) => ({doc, bag:bags[ix]}))
        // only consider docs which exist in firestore
        .filter(({doc}) => doc.exists)
        // we only need the first one
        .slice(0,1)
        // make it into a serializable tiddler
        .map(({bag, doc}) => ({tiddler: doc.data() as FirestoreSerializedTiddler, bag})));
};

// validates the "text" field of a tiddler against a schema.
const getContentValidatingReader = (schema:Schema) => {
    const validate = getValidator(schema);
    return async (db:DB, transaction:FirebaseFirestore.Transaction, wiki:string, bag:string, title:string, fallbackValue?:any) => {
        const tiddlerWithBag = await readTiddler(db, transaction, wiki, [bag], title);
        const value = (tiddlerWithBag && tiddlerWithBag.tiddler && tiddlerWithBag.tiddler.text) ? JSON.parse(tiddlerWithBag.tiddler.text) : fallbackValue;
        const validation = validate(value)
        if (!validation.valid) {
            throw new Error(`tiddler does not conform to schema: ${JSON.stringify(validation.errors)}`);
        }
        return value;
    };
};

// validates the "text" field of a tiddler against a schema.
const getContentValidatingTransformer = (schema:Schema) => {
    const validate = getValidator(schema);
    return async (transform:((data:any) => Promise<any>), db:DB, transaction:FirebaseFirestore.Transaction, user:User, wiki:string, bag:string, title:string, fallbackValue?:any):Promise<FirestoreSerializedTiddler> => {
        const serializedTiddlerWithBag = await readTiddler(db, transaction, wiki, [bag], title);
        const originalValue = (serializedTiddlerWithBag && serializedTiddlerWithBag.tiddler && serializedTiddlerWithBag.tiddler.text) ? JSON.parse(serializedTiddlerWithBag.tiddler.text) : fallbackValue;
        const originalValidation = validate(originalValue)
        if (!originalValidation.valid) {
            throw new Error(`original tiddler text does not conform to schema: ${JSON.stringify(originalValidation.errors)}`);
        }
        const transformedValue = await transform(originalValue);
        const transformedValidation = validate(transformedValue);
        if (!transformedValidation.valid) {
            throw new Error(`transformed tiddler text does not conform to schema: ${JSON.stringify(transformedValidation.errors)}`);
        }
        const transformedTiddler = Object.assign({}, serializedTiddlerWithBag?.tiddler, {title, text: JSON.stringify(transformedValue)});
        await writeTiddler(db, transaction, user, wiki, bag, transformedTiddler);
        return transformedTiddler;
    };
};


const writeTiddler = async (db:DB, transaction:FirebaseFirestore.Transaction, user:User, wiki:string, bag:string, newTiddler:FirestoreSerializedTiddler) => {
    const revision = newTiddler.revision;
    const existingVersion = await readTiddler(db, transaction, wiki, [bag], newTiddler.title);
    if (existingVersion) {
      if (revision) {
        revisionCheck(existingVersion.tiddler, revision);
      } else {
        throw new HTTPError(`attempting to write ${existingVersion.tiddler.title} without explicit revision, when a previous version already exists`, HTTP_CONFLICT);
      }
    }

    const updatedTiddler = prepareTiddler(db, user, newTiddler, existingVersion?.tiddler);
    transaction.set(getTiddlerRef(db, wiki, bag, newTiddler.title), updatedTiddler);
    return updatedTiddler;
};

const removeTiddler = async (db:DB, transaction:FirebaseFirestore.Transaction, wiki:string, bag:string, title:string, revision:string) => {
    const tiddlerRef = getTiddlerRef(db, wiki, bag, title);
    const doc = await transaction.get(tiddlerRef);
    revisionCheck(doc, revision);
    await transaction.delete(tiddlerRef);
};

module.exports = {readBags, readTiddler, removeTiddler, writeTiddler, getContentValidatingReader, getContentValidatingTransformer};
