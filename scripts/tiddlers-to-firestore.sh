#!/usr/bin/env bash
DIR="${BASH_SOURCE%/*}"
MAIN="$DIR/../editions/tw-node-firestore/main.js"
FLAGS="$( [[ ${DEBUG} ]] && echo "--inspect-brk" )"
TOKEN="$($DIR/gettoken.sh)" TIDDLYWIKI_PLUGIN_PATH="$DIR/../plugins" node $FLAGS $MAIN "$DIR/../editions/tw-node-firestore" --verbose --load $1
