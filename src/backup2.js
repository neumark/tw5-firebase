const fetch = require("node-fetch");
global.fetch = fetch;
const { loadTiddler } = require('../plugins/neumark/firestore-syncadaptor-client/core.js');
const apiEndpoint=process.argv[2];
const wikiName = require('../etc/config.json').wiki.wikiName;
const TOKEN=process.argv[3];
const tiddlerId = {apiEndpoint, wikiName};
// if tiddler names set, get just that one specific tiddler
if (process.argv.length == 5) {
    Object.assign(tiddlerId, {
        recipe: 'default',
        tiddler: process.argv[4]
    });
}
loadTiddler(tiddlerId, TOKEN).then(tiddlers => {
    console.log(JSON.stringify(Array.isArray(tiddlers) ? tiddlers : [tiddlers], null, 4));
});
