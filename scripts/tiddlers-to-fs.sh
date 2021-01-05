#!/usr/bin/env bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
TIDDLYWIKI="$DIR/../node_modules/.bin/tiddlywiki"
FLAGS="$( [[ ${DEBUG} ]] && echo "--inspect-brk" )"
TIDDLYWIKI_PLUGIN_PATH="$DIR/../plugins" node $FLAGS $TIDDLYWIKI "$DIR/../editions/tw-local" --verbose --load $1
