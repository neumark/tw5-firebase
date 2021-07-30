const { getOuterConfig } = require('./webpack-frontend-common.js');

module.exports = (env, webpackArgs) => {
  const common = { mode: webpackArgs.mode };
  return [
    getOuterConfig({
      input: 'src/inner-main.ts',
      outputDir: '../dist',
      outputFilename: 'inner-main.js',
      ...common,
    })
  ];
};
