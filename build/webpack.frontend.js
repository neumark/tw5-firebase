const { getTW5PluginConfig, getTW5PrebootConfig, getOuterConfig } = require('./webpack-common');
module.exports = (env, webpackArgs) => {
  const common = { mode: webpackArgs.mode };
  return [
      /*
    getTW5PluginConfig({
      input: 'src/frontend/tw5/plugins/syncadaptor/syncadaptor.ts',
      outputDir: 'dist/plugins/tw5-firebase/syncadaptor',
      outputFilename: 'syncadaptor.js',
      ...common,
    }),
    getTW5PluginConfig({
      input: 'src/frontend/tw5/plugins/gcp-storage-attachments/gcp-storage-attachments.ts',
      outputDir: 'dist/plugins/tw5-firebase/gcp-storage-attachments',
      outputFilename: 'gcp-storage-attachments.js',
      ...common,
    }),
    getTW5PluginConfig({
      input: 'src/frontend/tw5/plugins/clock-widget/clock.ts',
      outputDir: 'dist/plugins/tw5-firebase/clock-widget',
      outputFilename: 'clock.js',
      ...common,
    }),
    getTW5PrebootConfig({
      input: 'src/frontend/preboot/main.ts',
      outputDir: 'dist/preboot',
      outputFilename: 'main.js',
      ...common,
    }),*/
    getOuterConfig({
      input: 'src/frontend/outerframe/outer-main.ts',
      outputDir: 'dist/outer',
      outputFilename: 'outer-main.js',
      ...common,
    })
  ];
};
