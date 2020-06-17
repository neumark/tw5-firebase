const admin = require("firebase-admin");
const Firestore = require('@google-cloud/firestore');
const {fixDates} = require('../functions/src/tw');

admin.initializeApp({
  databaseURL: "https://peterneumark-com.firebaseio.com"
});

const db = new Firestore.Firestore();

db.collection('wikis/pn-wiki/global/').get().then(snapshot => {
    const tiddlers = [];
    snapshot.forEach(doc => tiddlers.push(fixDates(doc.data())));
    return tiddlers;
}).then(t => console.log(JSON.stringify(t, null, 4)));
