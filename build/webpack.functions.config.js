const path = require('path');
module.exports = require("./config-node").getConfigBuilder({
    input: 'src/backend/index.ts',
    outputDir: 'functions',
    outputFilename: 'index.js'});
