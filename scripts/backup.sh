#!/usr/bin/env bash
DIR="${BASH_SOURCE%/*}"
TMP="$(mktemp).json"
GOOGLE_APPLICATION_CREDENTIALS="$DIR/../service-account-key.json" node "$DIR/../src/backup.js" > "$TMP"
TIDDLYWIKI="$DIR/../node_modules/.bin/tiddlywiki"
TIDDLYWIKI_PLUGIN_PATH="$DIR/../plugins" node $TIDDLYWIKI "$DIR/../tw-local" --load "$TMP"
rm "$TMP"
