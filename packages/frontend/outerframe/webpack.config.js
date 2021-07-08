const { getOuterConfig } = require('./webpack-frontend-common.js');

module.exports = (env, webpackArgs) => {
  const common = { mode: webpackArgs.mode };
  return [
    getOuterConfig({
      input: 'src/outer-main.ts',
      outputDir: 'public',
      outputFilename: 'outer-main.js',
      ...common,
    })
  ];
};
