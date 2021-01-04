#!/usr/bin/env bash
DIR="${BASH_SOURCE%/*}"
TIDDLYWIKI="$DIR/../node_modules/.bin/tiddlywiki"
FLAGS="$( [[ ${DEBUG} ]] && echo "--inspect-brk" )"
TIDDLYWIKI_PLUGIN_PATH="$DIR/../plugins" node $FLAGS $TIDDLYWIKI "$DIR/../editions/tw-local" --verbose --load $1
