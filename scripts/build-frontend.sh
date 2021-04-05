#!/usr/bin/env bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
# set up env
. "$DIR/env.sh"

pushd "$DIR/.."
# build syncadaptor plugin
yarn run webpack -c build/webpack.tw5-plugins.js --mode production

# build preboot main
yarn run webpack -c build/webpack.tw5-preboot.js --mode production

# build tiddlywiki all-in-one html
TIDDLYWIKICLI="$DIR/../node_modules/.bin/tiddlywiki"
tiddlywiki_cli "$DIR/../editions/spabuilder" --output "$DIR/../public" --load "$DIR/../etc/config.json" --build index

popd
