#!/usr/bin/env bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
# set up env
. "$DIR/env.sh"

pushd "$DIR/.."
# build frontend (tiddlywiki all-in-one html)
TIDDLYWIKICLI="$DIR/../node_modules/.bin/tiddlywiki"
tiddlywiki_cli "$DIR/../editions/spabuilder" --output "$DIR/../public" --load "$DIR/../etc/config.json" --build index

# build backend (firebase functions)
yarn run webpack --mode development --config build/webpack.functions.config.js
popd
