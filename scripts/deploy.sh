#!/usr/bin/env bash
DIR="${BASH_SOURCE%/*}"
FIREBASECLI="$DIR/../node_modules/.bin/firebase"
node $FIREBASECLI deploy --project peterneumark-com --token "$(cat "$DIR/../etc/keys.json" | jq -r ".firebaseToken")" --only hosting:pn-wiki,functions:wiki,firestore:rules,storage:rules
