/* global __dirname, require, module*/
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
const path = require('path');
const supportedBrowsers = require('./supported_browsers.json');
const fs = require('fs');

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
}) => (_, webpackArgv) => {
  const entry = path.resolve(__dirname, '..', input);
  const getBanner = () => {
      let banner = "";
      const bannerFile = `${entry}.meta`;
      if (fs.existsSync(bannerFile)) {
        banner = fs.readFileSync(bannerFile, {encoding: 'utf-8'});
      }
      return `/*\\
${banner}\\*/`;
  };
  const isProduction = webpackArgv.mode === 'production';
  return {
      mode: webpackArgv.mode,
      entry,
      devtool: 'source-map',
      output: {
        library: {
            // name: 'adaptorClass', //path.basename(input, '.ts'),
            type: 'commonjs',
        },
        path: path.resolve(__dirname, '..', outputDir),
        filename: outputFilename,
        globalObject: 'globalThis'
        //umdNamedDefine: true
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
          {
            test: /\.css$/i,
            use: ['style-loader', 'css-loader']
          }
        ],
      },
      externals: {
          // make firebase and firebase-ui external
          firebase: 'firebase',
          firebaseui: 'firebaseui'
      },
      resolve: {
        modules: [modulesDir],
        extensions: ['.json', '.js', '.tsx', '.ts']
      },
      plugins: [].concat(
        isProduction ? [] : [
            // only used by dev builds, in prod builds, these are stripped out by terser
            new webpack.BannerPlugin({
               banner: getBanner(),
               raw: true
            })],
          [new webpack.SourceMapDevToolPlugin({
              filename: '[file].map',
              publicPath: '/sourcemaps/',
              //fileContext: 'dist',
          })]
      ),
      optimization: isProduction ? {
        minimize: true,
        minimizer: [
          new TerserPlugin({
            terserOptions: {
              output: {
                preamble: getBanner(),
                comments: false,
              },
            },
            extractComments: false
          }),
        ],
      } : {minimize: false}
    };
  };

module.exports = {getConfigBuilder};
