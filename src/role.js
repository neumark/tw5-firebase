const admin = require("firebase-admin");
const Firestore = require('@google-cloud/firestore');
const config = require(process.env.CONFIGPATH);

admin.initializeApp(config.firebase);

/*
 *
const {fixDates} = require('../functions/src/tw');
const rolesKey = `/wikis/${config.wiki.wikiName}/system/$:_config_firestore-syncadaptor-client_roles`
const db = new Firestore.Firestore();

const doGrant = async () => {
    db.doc(rolesKey).get().then(doc => {
        console.log("doc.exists", doc.exists, "doc.data", doc.data());
    });
};
*/
const db = require('../functions/src/db').getDB(admin);
const {readRoles} = require('../functions/src/role');

const doGrant = async () => await db.runTransaction(async transaction => {
    const roles = await readRoles(db, transaction, config.wiki.wikiName);
    console.log(roles);
});

doGrant().then(console.log, console.error);
