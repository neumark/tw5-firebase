const {getNodeConfig} = require('./webpack-common');
module.exports = getNodeConfig({
        input: 'src/backend/index.ts',
        outputDir: 'functions',
        outputFilename: 'index.js'});
