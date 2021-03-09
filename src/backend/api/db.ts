import * as admin from 'firebase-admin';

export const getDB = (getFirestoreDb: () => admin.firestore.Firestore) => {
    const db = getFirestoreDb();
    return {
        runTransaction: (fn:((tx:FirebaseFirestore.Transaction) => Promise<any>)) => db.runTransaction(fn),
        collectionRef: (path:string) => db.collection(path),
        // not traditionally considered a database primitive, whatever
        getTimestamp: () => new Date()
    };
};

export type DB = ReturnType<typeof getDB>;
