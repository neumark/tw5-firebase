const webpack = require('webpack');
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const PnpPlugin = require("pnp-webpack-plugin");
const supportedBrowsers = require('./supported_browsers.json');
const fs = require('fs');

const getBuildConfig = () => Object.assign(
        {},
        JSON.parse(process.env.WIKI_LOCATION ?? '{}'),
        JSON.parse(process.env.FIREBASE_CONFIG ?? '{}'));

const tsConfig = path.resolve(__dirname, 'tsconfig.json');

const tsLoader = {
            loader: 'ts-loader',
            options: {
              configFile: tsConfig,
            }}

const babelLoader = {
  loader: 'babel-loader',
  options: {
    presets: [
      [
        '@babel/preset-env',
        {
          debug: true,
          corejs: {
               version: '3'
          },
          useBuiltIns: 'usage',
          targets: supportedBrowsers,
        },
      ],
    ],
    plugins: [
        /*['@babel/plugin-transform-runtime', {
        corejs: {
           version: '3'
        }
    }],
    ['@babel/plugin-proposal-export-default-from']*/
    ],
  },
};


const getBaseConfig = ({
  input,
  outputFilename,
  outputDir = 'dist',
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
  resolve: {
    plugins: [PnpPlugin],
    extensions: ['.json', '.js', '.tsx', '.ts'],
  },
  module: {},
  resolveLoader: {
    plugins: [PnpPlugin.moduleLoader(module)],
  },
  node: {
    __dirname: true, // Webpack has to manually solve __dirname references (future-proofing)
  },
  plugins: [
      /*
      new webpack.DefinePlugin({
      "__BUILD_CONFIG__":JSON.stringify(JSON.stringify(getBuildConfig()))
    })*/
  ],
});

const getTW5PluginConfig = (baseOptions) => {
  const pluginConfig = getBaseConfig(baseOptions);
  const isProduction = pluginConfig.mode !== 'development';
  const getBanner = () => {
    let banner = '';
    const bannerFile = `${pluginConfig.entry}.meta`;
    if (fs.existsSync(bannerFile)) {
      banner = fs.readFileSync(bannerFile, { encoding: 'utf-8' });
    }
    return `/*\\\n${banner}\n\\*/\n`;
  };
  Object.assign(pluginConfig, {
    externals: [
      {
        // make firebase and firebase-ui external
        firebase: 'global firebase',
        firebaseui: 'global firebaseui',
      }
    ],
  });
  Object.assign(pluginConfig.output, {
    library: { },
    globalObject: 'globalThis',
  });
  // override loaders to include babel and non TS sources (js, css):
  pluginConfig.module.rules = [
    {
      test: /\.tsx?$/,
      use: [
        babelLoader,
        tsLoader
      ]
    },
    {
      test: /\.(jsx?)$/,
      use: babelLoader,
    },
    {
      test: /\.css$/i,
      use: ['style-loader', 'css-loader'],
    },
  ];
  pluginConfig.plugins.push(
    new webpack.SourceMapDevToolPlugin({
      filename: 'sourcemaps/[file].map',
      //publicPath: '/sourcemaps/',
    }),
  );
  // BannerPlugin is only used in dev mode
  if (!isProduction) {
    pluginConfig.plugins.push(
      new webpack.BannerPlugin({
        banner: getBanner(),
        raw: true,
      }),
    );
  }
  pluginConfig.optimization = isProduction
    ? {
        minimize: true,
        minimizer: [
          new TerserPlugin({
            terserOptions: {
              output: {
                // preamble: getBanner(),
                comments: false,
              },
            },
            extractComments: false,
          }),
        ],
      }
    : { minimize: false };
  return pluginConfig;
};

const getOuterConfig = (pluginOptions) => {
  const config = getTW5PluginConfig(pluginOptions);
  config.output.library.type = 'window';
  return config;
};

module.exports = { getOuterConfig };
