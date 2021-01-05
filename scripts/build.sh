#!/usr/bin/env bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
TIDDLYWIKI="$DIR/../node_modules/.bin/tiddlywiki"
TIDDLYWIKI_PLUGIN_PATH="$DIR/../plugins" node $TIDDLYWIKI "$DIR/../tw" --output "$DIR/../public" --build index --verbose
