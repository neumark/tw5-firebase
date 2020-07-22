#!/usr/bin/env bash
DIR="${BASH_SOURCE%/*}"
MAIN="$DIR/../node_modules/.bin/tiddlywiki"
TIDDLYWIKI_PLUGIN_PATH="$DIR/../plugins" node $( [[ ${DEBUG} ]] && echo "--inspect-brk" ) $MAIN "$DIR/../editions/tw-local" --verbose --load $1
