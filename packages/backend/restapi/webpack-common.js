const webpack = require('webpack');
const path = require('path');
const nodeExternals = require('webpack-node-externals');
const fs = require('fs');
// const PnpPlugin = require("pnp-webpack-plugin");

const getBaseConfig = ({
  input,
  outputFilename,
  outputDir = 'dist',
  tsConfig = 'tsconfig.json',
  mode = 'production',
}) => ({
  mode,
  entry: path.resolve(process.cwd(), input),
  devtool: 'source-map',
  output: {
    path: path.resolve(process.cwd(), outputDir),
    filename: outputFilename,
    globalObject: 'globalThis',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: tsConfig,
            },
          },
        ]
      }
    ]
  },
  resolveLoader: {
    // plugins: [PnpPlugin.moduleLoader(module)],
  },
  resolve: {
    // plugins: [PnpPlugin],
    extensions: ['.json', '.js', '.tsx', '.ts'],
  },
  node: {
    __dirname: true, // Webpack has to manually solve __dirname references (future-proofing)
  },

  plugins: [],
});

const getNodeConfig = (baseOptions) => {
  const nodeConfig = getBaseConfig({
    ...baseOptions,
    mode: 'development',
  });
  Object.assign(nodeConfig, {
    target: 'node',
    externalsPresets: {
      node: true,
    },
    externals: [nodeExternals({
        allowlist: [/^@tw5-firebase/]
    })],
  });
  Object.assign(nodeConfig.output, {
    libraryTarget: 'this',
    umdNamedDefine: true,
  });
  return nodeConfig;
};

module.exports = { getNodeConfig };
