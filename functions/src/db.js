const getDB = admin => {
    const db = admin.firestore();
    return {
        dateToFirestoreTimestamp: date => admin.firestore.Timestamp.fromDate(date),
        runTransaction: fn => db.runTransaction(fn),
        collectionRef: path => db.collection(path)
    };
};

module.exports = { getDB };
