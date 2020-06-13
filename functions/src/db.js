const admin = require('firebase-admin');
const db = admin.firestore();

const dateToFirestoreTimestamp = date => admin.firestore.Timestamp.fromDate(date);

const runTransaction = fn => db.runTransaction(fn);

const collectionRef = path => db.collection(path);

module.exports = { dateToFirestoreTimestamp, runTransaction, collectionRef };
