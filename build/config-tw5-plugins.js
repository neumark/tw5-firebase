/* global __dirname, require, module*/
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
const path = require('path');
const supportedBrowsers = require('./supported_browsers.json');

const getBanner = () => "BANNER (TODO)"

const babelLoader = {
  loader: "babel-loader",
  options: {
    presets: [
        [
            '@babel/preset-env',
            {
                "debug": true,
                "corejs":3,
                "useBuiltIns": "usage",
                "targets": supportedBrowsers
            }
        ]
    ],
    plugins: [
        [
            '@babel/plugin-transform-runtime',
            {"corejs": 3}
        ]
    ]
  }
};

const getConfigBuilder = ({
    input,
    outputFilename,
    outputDir = 'dist',
    modulesDir = path.resolve(__dirname, '..', 'node_modules')
}) => (_, webpackArgv) => ({
  mode: webpackArgv.mode,
  entry: path.resolve(__dirname, '..', input),
  devtool: 'source-map',
  output: {
    library: {
        name: path.basename(input, '.ts'),
        type: 'commonjs',
    },
    path: path.resolve(__dirname, '..', outputDir),
    filename: outputFilename
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          babelLoader,
          {
            loader: 'ts-loader',
            options: {
                configFile: path.resolve(__dirname, 'tsconfig-browser.json')
            }
          },
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.(jsx?)$/,
        exclude: /node_modules/,
        use: babelLoader,
      },
    ],
  },
  resolve: {
    modules: [modulesDir],
    extensions: ['.json', '.js', '.tsx', '.ts']
  },
  plugins: [
    new webpack.BannerPlugin({
      banner: getBanner
    })
  ],
  optimization: webpackArgv.mode === 'production' ? {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          output: {
            preamble: `/*${getBanner()}*/`,
            comments: false,
          },
        },
        extractComments: false
      }),
    ],
  } : {minimize: false}
});

module.exports = {getConfigBuilder};
