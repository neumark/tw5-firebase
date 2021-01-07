#!/usr/bin/env bash

# inspired by: https://davidalfonso.es/posts/migrating-from-tiddlywiki-to-markdown-files

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
# set up env
. "$DIR/env.sh"

TMPDIR="$(mktemp -d)"
TIDDLYWIKICLI="$DIR/../editions/tw-node-firestore/main.js"
ID_TOKEN="$($DIR/gettoken.sh)"
TOKEN="$ID_TOKEN" tiddlywiki_cli "$DIR/../editions/tw-node-firestore" \
    --output "$TMPDIR" \
    --render "TW5-firebase/README" "[is[tiddler]addsuffix[.html]]" "text/plain" "$:/pn-wiki/static/templates/static.tiddler.html"
pandoc -f html-native_divs-native_spans -t gfm --wrap=preserve "$TMPDIR/TW5-firebase/README.html" -o "$TMPDIR/README.md"

cp "$TMPDIR/README.md" "$DIR/../"

rm -rf "$TMPDIR"
