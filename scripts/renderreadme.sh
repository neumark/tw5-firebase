#!/usr/bin/env bash
# inspired by: https://davidalfonso.es/posts/migrating-from-tiddlywiki-to-markdown-files
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
TMPDIR="$(mktemp -d)"
MAIN="$DIR/../editions/tw-node-firestore/main.js"
#TOKEN="$($DIR/gettoken.sh)" TIDDLYWIKI_PLUGIN_PATH="$DIR/../plugins" node $MAIN "$DIR/../editions/tw-local" --output "$TMPDIR" --build readme --verbose
TOKEN="$($DIR/gettoken.sh)" TIDDLYWIKI_PLUGIN_PATH="$DIR/../plugins" node $FLAGS $MAIN "$DIR/../editions/tw-node-firestore" --output "$TMPDIR" --build readme --verbose
pandoc -f html-native_divs-native_spans -t commonmark --wrap=preserve "$TMPDIR/readme.html" -o "$DIR/../README.md"

rm -rf "$TMPDIR"
