const path = require('path');
module.exports = require("./config-tw5-plugins").getConfigBuilder({
    input: 'src/frontend/tw5/plugins/syncadaptor/syncadaptor.ts',
    outputDir: 'dist/plugins',
    outputFilename: 'syncadaptor.js'});
