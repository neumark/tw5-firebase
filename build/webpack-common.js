const webpack = require('webpack');
const path = require('path');
const nodeExternals = require('webpack-node-externals');
const TerserPlugin = require('terser-webpack-plugin');
const supportedBrowsers = require('./supported_browsers.json');
const fs = require('fs');

const projectRoot = path.resolve(__dirname, '..');
const modulesDir = path.resolve(projectRoot, 'node_modules');

const getBaseConfig = ({
  input,
  outputFilename,
  outputDir = 'dist',
  tsConfig = path.resolve(projectRoot, 'tsconfig.json'),
  mode = 'production',
}) => ({
  mode,
  entry: path.resolve(projectRoot, input),
  devtool: 'source-map',
  output: {
    path: path.resolve(projectRoot, outputDir),
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
        ],
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    modules: [modulesDir],
    extensions: ['.json', '.js', '.tsx', '.ts'],
  },
  plugins: [],
});

const getNodeConfig = (baseOptions) => {
  const nodeConfig = getBaseConfig({
    ...baseOptions,
    mode: 'development',
    tsConfig: path.resolve(__dirname, 'tsconfig-node.json'),
  });
  Object.assign(nodeConfig, {
    target: 'node',
    externalsPresets: {
      node: true,
    },
    externals: [nodeExternals({ modulesDir })],
  });
  Object.assign(nodeConfig.output, {
    libraryTarget: 'this',
    umdNamedDefine: true,
  });
  return nodeConfig;
};

const babelLoader = {
  loader: 'babel-loader',
  options: {
    presets: [
      [
        '@babel/preset-env',
        {
          debug: true,
          corejs: 3,
          useBuiltIns: 'usage',
          targets: supportedBrowsers,
        },
      ],
    ],
    plugins: [['@babel/plugin-transform-runtime', { corejs: 3 }]],
  },
};

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
      },
      function ({ context, request }, callback) {
        // console.log("externals", context, request);
        if (request.startsWith('$:/')) {
          // Externalize to a commonjs module using the request path
          return callback(null, 'commonjs ' + request);
        }
        // Continue without externalizing the import
        callback();
      },
    ],
  });
  Object.assign(pluginConfig.output, {
    library: { type: 'commonjs' },
    globalObject: 'globalThis',
  });
  // override loaders to include babel and non TS sources (js, css):
  pluginConfig.module.rules = [
    {
      test: /\.tsx?$/,
      use: [
        babelLoader,
        {
          loader: 'ts-loader',
          options: {
            configFile: path.resolve(__dirname, 'tsconfig-browser.json'),
          },
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
      use: ['style-loader', 'css-loader'],
    },
  ];
  pluginConfig.plugins.push(
    new webpack.SourceMapDevToolPlugin({
      filename: '[file].map',
      publicPath: '/sourcemaps/',
      //fileContext: 'dist',
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
                preamble: getBanner(),
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

const getTW5PrebootConfig = (pluginOptions) => {
  const prebootConfig = getTW5PluginConfig(pluginOptions);
  prebootConfig.output.library.type = 'window';
  return prebootConfig;
};

module.exports = { getNodeConfig, getTW5PluginConfig, getTW5PrebootConfig };
