const { getTW5PluginConfig, getTW5PrebootConfig, getOuterConfig } = require('./webpack-common');
module.exports = (env, webpackArgs) => {
  const common = { mode: webpackArgs.mode };
  return [
    getOuterConfig({
      input: 'src/outer-main.ts',
      outputDir: 'dist',
      outputFilename: 'outer-main.js',
      ...common,
    })
  ];
};
