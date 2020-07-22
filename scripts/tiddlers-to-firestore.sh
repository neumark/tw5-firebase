#!/usr/bin/env bash
DIR="${BASH_SOURCE%/*}"
MAIN="$DIR/../editions/tw-node-firestore/main.js"
TOKEN="$($DIR/gettoken.sh)" TIDDLYWIKI_PLUGIN_PATH="$DIR/../plugins" node $( [[ ${DEBUG} ]] && echo "--inspect-brk" ) $MAIN "$DIR/../editions/tw-node-firestore" --verbose --load $1
