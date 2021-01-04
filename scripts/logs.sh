#!/usr/bin/env bash
DIR="${BASH_SOURCE%/*}"
FIREBASECLI="$DIR/../node_modules/.bin/firebase"
GOOGLE_APPLICATION_CREDENTIALS="$DIR/../etc/service-account-key.json" node "$FIREBASECLI" --token "$(cat "$DIR/../etc/keys.json" | jq -r ".firebaseToken")" functions:log
