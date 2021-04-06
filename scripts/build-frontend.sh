#!/usr/bin/env bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
# set up env
. "$DIR/env.sh"

pushd "$DIR/.."
# build syncadaptor plugin
yarn run webpack -c build/webpack.tw5-plugins.js --mode production
# copy plugin info for syncadaptor
cp src/frontend/tw5/plugins/syncadaptor/plugin.info dist/plugins/tw5-firebase/syncadaptor

# build preboot main
yarn run webpack -c build/webpack.tw5-preboot.js --mode production

# build tiddlywiki all-in-one html
TIDDLYWIKICLI="$DIR/../node_modules/.bin/tiddlywiki"
tiddlywiki_cli "$DIR/../editions/spabuilder" --output "$DIR/../dist" --load "$DIR/../dist/preboot/main.js" --build spa 
# copy tw5.html to public/
cp dist/tw5.html public/index.html

# copy sourcemaps to public/sourcemaps
mkdir -p public/sourcemaps
find dist -type f -name '*.js.map' -exec cp '{}' public/sourcemaps \;

popd
