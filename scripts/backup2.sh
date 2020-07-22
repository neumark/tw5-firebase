#!/usr/bin/env bash
DIR="${BASH_SOURCE%/*}"
TMP="$(mktemp).json"
"$DIR/export.sh" > "$TMP"
"$DIR/tiddlers-to-fs.sh" "$TMP"
rm "$TMP"
