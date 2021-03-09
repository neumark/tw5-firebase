const webpack = require('webpack');
const path = require('path');
const nodeExternals = require('webpack-node-externals');

const getConfigBuilder = ({
    input,
    outputFilename,
    outputDir = 'dist',
    modulesDir = path.resolve(__dirname, '..', 'node_modules')
}) => (_, webpackArgv) => ({
  mode: webpackArgv.mode,
  entry: path.resolve(__dirname, '..', input),
  devtool: 'source-map',
  target: 'node',
  externalsPresets: {
      node: true
  },
  externals: [nodeExternals({
      modulesDir
  })],
  output: {
    path: path.resolve(__dirname, '..', outputDir),
    filename: outputFilename,
    libraryTarget: 'this'
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [{
            loader: 'ts-loader',
            options: {
                // configFile: path.resolve(__dirname, 'tsconfig.json')
            }
        }],
        exclude: /node_modules/,
      }
    ]
  },
  resolve: {
    modules: [modulesDir],
    extensions: ['.json', '.js', '.tsx', '.ts']
  },
  plugins: [
    new webpack.DefinePlugin({
      '__BUILDDATE__': JSON.stringify((new Date()).toISOString())
    }),
  ],
});

module.exports = {getConfigBuilder};
