#!/usr/bin/env bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
TMP="$(mktemp).json"
"$DIR/export.sh" > "$TMP"
"$DIR/tiddlers-to-fs.sh" "$TMP"
rm "$TMP"
