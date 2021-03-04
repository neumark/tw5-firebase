const path = require('path');
module.exports = require("./config-node").getConfigBuilder({
    input: 'src/backend/index.js',
    outputDir: 'functions',
    outputFilename: 'index.js',
    modulesDir: path.resolve(__dirname, '..', 'functions/node_modules')});
