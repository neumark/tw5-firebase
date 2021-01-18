const fs = require('fs');
const { getDB } = require('../../functions/src/db');
const { writeTiddler } = require('../../functions/src/persistence');

const DEFAULT_BAG = 'content';

const superadminEmail = wiki => `superadmin@${wiki}`;

const readFile = f => JSON.parse(fs.readFileSync(f.toString()));

module.exports = admin => {
    const db = getDB(admin);
    return {
        importTiddlers: {
            command: 'import <tiddlers..>',
            desc: 'import json files(s) containing tiddlers',
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
        }
    };
};
