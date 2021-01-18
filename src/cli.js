const admin = require("firebase-admin");
const path = require('path');

const NONE_ROLE = "none";

const config = require(process.env.CONFIGPATH || path.resolve(__dirname, '../etc/config.json'));

admin.initializeApp(config.firebase);

const defaultWiki = config.wiki.wikiName;

const {setrole, getrole} = require('./cli/roles.js')(admin);
const {importTiddlers} = require('./cli/import.js')(admin);

const argv = require('yargs/yargs')(process.argv.slice(2))
    .usage('Usage: $0 <command> [options]')
    .alias('w', 'wiki')
    .nargs('w', 1)
    .describe('w', 'name of wiki to operate on')
    .default('w', defaultWiki)
    .command(setrole)
    .command(getrole)
    .command(importTiddlers)
    .example('$0 setrole foo@bar.com admin', 'grant admin role to foo@bar.com on default wiki')
    .example('$0 -w another-wiki getrole foo@bar.com', 'get role assigned to foo@bar.com on another-wiki')
    .help()
    .wrap(80)
    .alias('h', 'help')
    .epilog('Find more help at: https://neumark.github.io/tw5-firebase/')
    .onFinishCommand(async output => {
        if (output) {
            console.log(output);
        }
        // node process hangs without this, see: https://stackoverflow.com/a/46177431
        await admin.app().delete();
    })
    .argv;
