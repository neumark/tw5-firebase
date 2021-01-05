#!/usr/bin/env bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
MAIN="$DIR/../editions/tw-node-firestore/main.js"
FLAGS="$( [[ ${DEBUG} ]] && echo "--inspect-brk" )"
TOKEN="$($DIR/gettoken.sh)" TIDDLYWIKI_PLUGIN_PATH="$DIR/../plugins" node $FLAGS $MAIN "$DIR/../editions/tw-node-firestore" --verbose --load $1
