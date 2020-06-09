#!/usr/bin/env bash
DIR="${BASH_SOURCE%/*}"
FIREBASE="$DIR/../node_modules/.bin/firebase"
$FIREBASE deploy --token "$(cat "$DIR/../.firebase-token")" --only hosting:pn-wiki,functions:wiki
