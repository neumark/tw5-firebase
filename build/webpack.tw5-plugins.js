const path = require('path');
module.exports = require("./config-tw5-plugins").getConfigBuilder({
    input: 'src/frontend/plugins/syncadaptor/syncadaptor.ts',
    outputDir: 'dist/plugins',
    outputFilename: 'syncadaptor.js'});
