#!/usr/bin/env bash

# inspired by: https://davidalfonso.es/posts/migrating-from-tiddlywiki-to-markdown-files

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
# set up env
. "$DIR/env.sh"

TMPDIR="$(mktemp -d)"
TIDDLYWIKICLI="$DIR/../editions/tw-node-firestore/main.js"
TOKEN="$($DIR/gettoken.sh)" tiddlywiki_cli "$DIR/../editions/tw-node-firestore" --output "$TMPDIR" --build readme
pandoc -f html-native_divs-native_spans -t gfm --wrap=preserve "$TMPDIR/readme.html" -o "$DIR/../README.md"

rm -rf "$TMPDIR"
