#!/usr/bin/env bash
DIR="${BASH_SOURCE%/*}"
FIREBASE="$DIR/../node_modules/.bin/firebase"
GOOGLE_APPLICATION_CREDENTIALS="$DIR/../service-account-key.json" node "$FIREBASE" --token "$(cat "$DIR/../.firebase-token")" functions:log
