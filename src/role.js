const admin = require("firebase-admin");
const Firestore = require('@google-cloud/firestore');
const config = require(process.env.CONFIGPATH);
const { roleNames, rolesSchema } = require('../functions/src/schema');
const { getDB } = require('../functions/src/db');
const {readRoles} = require('../functions/src/role');
const {getContentValidatingTransformer} = require('../functions/src/persistence');
const { ROLES_TIDDLER, GLOBAL_SYSTEM_BAG} = require('../functions/src/constants'); 

admin.initializeApp(config.firebase);

const db = getDB(admin);

const wiki = config.wiki.wikiName;
const superadminEmail = `superadmin@${wiki}`;
// TODO
const role = "admin";
const email = "neumark.peter@gmail.com";

const roleTransformer = getContentValidatingTransformer(rolesSchema);

// ensure array
const ensurePresent = (arr, elem) => arr.includes(elem) ? arr : arr.concat(elem);

const addUser = (roles, role, email) => Object.assign({}, roles, {[role]: ensurePresent(roles[role] || [], email)});

// grant role to email on wiki
const grant = async (db, transaction, role, email, wiki) => await roleTransformer(
    roles => addUser(roles, role, email),
    db, transaction, superadminEmail, wiki, GLOBAL_SYSTEM_BAG, ROLES_TIDDLER, {});

const doGrant = async () => await db.runTransaction(async transaction => {
    return await grant(db, transaction, role, email, wiki);
});

doGrant().then(console.log, console.error);
