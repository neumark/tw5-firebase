#!/usr/bin/env bash
DIR="${BASH_SOURCE%/*}"
MAIN="$DIR/../editions/tw-node-firestore/main.js"
TOKEN="$($DIR/gettoken.sh)" TIDDLYWIKI_PLUGIN_PATH="$DIR/../plugins" $MAIN "$DIR/../editions/tw-node-firestore" --output "$DIR/../static" --build static --verbose
