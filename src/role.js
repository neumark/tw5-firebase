const admin = require("firebase-admin");
const Firestore = require('@google-cloud/firestore');
const path = require('path');
const { roleNames, rolesSchema } = require('../functions/src/schema');
const { getDB } = require('../functions/src/db');
const {readRoles} = require('../functions/src/role');
const {getContentValidatingTransformer} = require('../functions/src/persistence');
const { ROLES_TIDDLER, GLOBAL_SYSTEM_BAG} = require('../functions/src/constants'); 


var argv = require('yargs/yargs')(process.argv.slice(2))
    .usage('Usage: $0 <command> [options]')
    .command('grant', 'grant a role to a user')
    .example('$0 grant -role admin -user foo@bar.com', 'grant admin role to foo@bar.com')
    .describe('role', 'User role')
    .describe('user', 'User email')
    .demandCommand(1)
    .help('h')
    .alias('h', 'help')
    .epilog('Find more help at: https://neumark.github.io/tw5-firebase/')
    .argv;

const config = require(process.env.CONFIGPATH || path.resolve(__dirname, '../etc/config.json'));

admin.initializeApp(config.firebase);

const db = getDB(admin);

const wiki = config.wiki.wikiName;
const superadminEmail = `superadmin@${wiki}`;

const roleTransformer = getContentValidatingTransformer(rolesSchema);

// ensure array
const ensurePresent = (arr, elem) => arr.includes(elem) ? arr : arr.concat(elem);

const addUser = (roles, role, email) => Object.assign({}, roles, {[role]: ensurePresent(roles[role] || [], email)});

const COMMANDS = {
    grant: async ({role, email}) => await db.runTransaction(async transaction => {
        return await _grant(db, transaction, role, email, wiki);
    })
};

// grant role to email on wiki
const _grant = async (db, transaction, role, email, wiki) => await roleTransformer(
    roles => addUser(roles, role, email),
    db, transaction, superadminEmail, wiki, GLOBAL_SYSTEM_BAG, ROLES_TIDDLER, {});

COMMANDS[argv['_'][0]](argv).then(console.log, console.error);
