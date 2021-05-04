const {getNodeConfig} = require('./webpack-common');
module.exports = getNodeConfig({
        input: 'src/cli/cli.ts',
        outputDir: 'dist',
        outputFilename: 'cli.js'});
