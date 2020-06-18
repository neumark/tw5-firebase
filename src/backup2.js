const fetch = require("node-fetch");
global.fetch = fetch;
const { loadTiddler } = require('../plugins/neumark/firestore-syncadaptor-client/core.js');
const HOST=process.argv[2];
const TOKEN=process.argv[3];
loadTiddler(HOST, "", TOKEN).then(tiddlers => console.log(JSON.stringify(tiddlers, null, 4)));
