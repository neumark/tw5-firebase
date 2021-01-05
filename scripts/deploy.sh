#!/usr/bin/env bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
FIREBASECLI="$DIR/../node_modules/.bin/firebase"
PROJECT="$(cat "$DIR/../etc/config.json" | jq -r ".firebaseProject")"
TOKEN="$(cat "$DIR/../etc/keys.json" | jq -r ".firebaseToken")"
node $FIREBASECLI deploy --project "$PROJECT" --token "$TOKEN" --only hosting:pn-wiki,functions:wiki,firestore:rules,storage:rules
