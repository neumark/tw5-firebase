#!/usr/bin/env bash
DIR="${BASH_SOURCE%/*}"
TIDDLYWIKI="$DIR/../node_modules/.bin/tiddlywiki"
TIDDLYWIKI_PLUGIN_PATH="$DIR/../plugins" node $TIDDLYWIKI "$DIR/../tw" --output "$DIR/../public" --build index --verbose
