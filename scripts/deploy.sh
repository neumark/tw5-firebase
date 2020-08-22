#!/usr/bin/env bash
DIR="${BASH_SOURCE%/*}"
FIREBASE="$DIR/../node_modules/.bin/firebase"
$FIREBASE deploy --token "$(cat "$DIR/../keys.json" | jq -r ".firebaseToken")" --only hosting:pn-wiki,functions:wiki,firestore:rules,storage:rules
