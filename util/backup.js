const admin = require("firebase-admin");
const Firestore = require('@google-cloud/firestore');

admin.initializeApp({
  databaseURL: "https://peterneumark-com.firebaseio.com"
});

const db = new Firestore.Firestore();

const pad = (num, length = 2) => num.toString().padStart(length, "0");

const stringifyDate = value => value.getUTCFullYear() +
			pad(value.getUTCMonth() + 1) +
			pad(value.getUTCDate()) +
			pad(value.getUTCHours()) +
			pad(value.getUTCMinutes()) +
			pad(value.getUTCSeconds()) +
			pad(value.getUTCMilliseconds(),3);

const stringifyFirestoreDate = d => stringifyDate(d.toDate());

const fixDates = ({created, modified, ...rest}) => ({
    created: stringifyFirestoreDate(created),
    modified: stringifyFirestoreDate(modified),
    ...rest});

db.collection('wikis/pn-wiki/global/').get().then(snapshot => {
    const tiddlers = [];
    snapshot.forEach(doc => tiddlers.push(fixDates(doc.data())));
    return tiddlers;
}).then(t => console.log(JSON.stringify(t, null, 4)));
