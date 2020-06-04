#!/usr/bin/env bash
DIR="${BASH_SOURCE%/*}"
TIDDLYWIKI="$DIR/../node_modules/.bin/tiddlywiki"
$TIDDLYWIKI "$DIR/../tw" --output "$DIR/../build" --build index
