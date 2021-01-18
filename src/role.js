const fs = require('fs');
const admin = require("firebase-admin");
const Firestore = require('@google-cloud/firestore');
const path = require('path');
const { roleNames, rolesSchema } = require('../functions/src/schema');
const { getDB } = require('../functions/src/db');
const {readRoles} = require('../functions/src/role');
const {getContentValidatingTransformer, writeTiddler} = require('../functions/src/persistence');
const { ROLES_TIDDLER, GLOBAL_SYSTEM_BAG} = require('../functions/src/constants'); 

const ROLE_ACTIONS = ['grant', 'revoke'];

const config = require(process.env.CONFIGPATH || path.resolve(__dirname, '../etc/config.json'));

admin.initializeApp(config.firebase);

const db = getDB(admin);

const defaultWiki = config.wiki.wikiName;

const DEFAULT_BAG = 'content';

const roleTransformer = getContentValidatingTransformer(rolesSchema);

// ensure array
const ensurePresent = (arr, elem) => arr.includes(elem) ? arr : arr.concat(elem);
const ensureMissing = (arr, elem) => arr.filter(e => e !== elem);


const userRole = (roles, role, email, action='grant') => Object.assign(
    {},
    roles,
    {[role]: (action === 'grant' ? ensurePresent : ensureMissing)(roles[role] || [], email)});

const superadminEmail = wiki => `superadmin@${wiki}`;

// grant role to email on wiki
const grantOrRevoke = async (db, transaction, role, email, wiki, action) => await roleTransformer(
    roles => userRole(roles, role, email, action),
    db, transaction, superadminEmail(wiki), wiki, GLOBAL_SYSTEM_BAG, ROLES_TIDDLER, {});

const readFile = f => JSON.parse(fs.readFileSync(f.toString()));

const argv = require('yargs/yargs')(process.argv.slice(2))
    .usage('Usage: $0 <command> [options]')
    .alias('w', 'wiki')
    .nargs('w', 1)
    .describe('w', 'name of wiki to operate on')
    .default('w', defaultWiki)
    .command({
        command: 'role <userid|email> [role] [action]',
        desc: 'grant a role to a user',
        builder: yargs => { yargs
            .positional('userid', {
            describe: 'User id or email address',
            type: 'string'})
            .positional('role', {
            describe: 'Role to assign',
            type: 'string',
            choices: roleNames,
            default: 'admin'})
            .positional('action', {
            describe: 'User role to assign / revoke',
            type: 'string',
            choices: ROLE_ACTIONS,
            default: 'grant'})
        },
        handler: argv => {
            if (!roleNames.includes(argv.role)) {
                throw new Error('invalid role '+argv.role);
            }
            const grantFn = async ({role, email, action, wiki}) => await db.runTransaction(
                async transaction => await grantOrRevoke(db, transaction, role, email, wiki, action));
            grantFn(argv).then(console.log, console.error);
        }
    })
    .command({
        command: 'import <tiddlers..>',
        desc: 'grant a role to a user',
        builder: yargs => { yargs
            .positional('tiddlers', {
            describe: 'JSON file(s) with tiddlers',
            type: 'string'})
        },
        handler: async ({wiki, tiddlers}) => {
            const allTiddlers = tiddlers.reduce((acc, tiddlerFile) => acc.concat(readFile(tiddlerFile)), []);
            for (tiddler of allTiddlers) {
                await db.runTransaction(
                    async transaction => {
                        await writeTiddler(db, transaction, superadminEmail(wiki), wiki, tiddler.bag || DEFAULT_BAG, tiddler);
                    });
            }
        }
    })
    .example('$0 role foo@bar.com', 'grant admin role to foo@bar.com')
    .example('$0 role foo@bar.com admin revoke', 'revoke admin role from foo@bar.com')
    .help()
    .wrap(72)
    .alias('h', 'help')
    .epilog('Find more help at: https://neumark.github.io/tw5-firebase/')
    .argv;
