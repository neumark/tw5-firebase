const { getNodeConfig } = require('./webpack-common');
module.exports = getNodeConfig({
  input: 'src/index.ts',
  outputDir: 'dist',
  outputFilename: 'index.js',
});
