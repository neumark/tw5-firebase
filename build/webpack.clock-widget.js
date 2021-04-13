const path = require('path');
module.exports = require("./config-tw5-plugins").getConfigBuilder({
    input: 'src/frontend/tw5/widgets/clock.ts',
    outputDir: 'dist/frontend/tw5/widgets/',
    outputFilename: 'clock.js'});
