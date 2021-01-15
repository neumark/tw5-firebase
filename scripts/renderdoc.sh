#!/usr/bin/env bash

# inspired by: https://davidalfonso.es/posts/migrating-from-tiddlywiki-to-markdown-files
# and https://www.didaxy.com/exporting-static-sites-from-tiddlywiki-part-5

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
# set up env
. "$DIR/env.sh"

TMPDIR="$(mktemp -d)"
TIDDLYWIKICLI="$DIR/../editions/tw-node-firestore/main.js"
ID_TOKEN="$($DIR/gettoken.sh)"

# export README as HTML
TOKEN="$ID_TOKEN" tiddlywiki_cli "$DIR/../editions/tw-node-firestore" \
    --output "$TMPDIR" \
    --render "TW5-firebase/README" "[is[tiddler]addsuffix[.html]]" "text/plain" "$:/pn-wiki/static/templates/static.readme.html"

# export docs as HTML
TOKEN="$ID_TOKEN" tiddlywiki_cli "$DIR/../editions/tw-node-firestore" \
    --output "$TMPDIR" \
    --render "[tag[TW5-firebase-docs]]" "[is[tiddler]addsuffix[.html]]" "text/plain" "$:/pn-wiki/static/templates/static.doc.html"


# convert README to Github Flavored Markdown
pandoc -f html-native_divs-native_spans -t gfm --wrap=preserve "$TMPDIR/TW5-firebase/README.html" -o "$TMPDIR/README.md"

# Copy README to root of repo
cp "$TMPDIR/README.md" "$DIR/../"

# Copy doc index
mv "$TMPDIR/doc_index.html" "$DIR/../docs/index.html"

# Copy remaining documentation files
mv "$TMPDIR"/*.html "$DIR/../docs/"

rm -rf "$TMPDIR"
