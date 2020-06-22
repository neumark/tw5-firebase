#!/usr/bin/env bash
DIR="$(dirname "${BASH_SOURCE%/*}")"
GOOGLE_APPLICATION_CREDENTIALS="$DIR/../service-account-key.json" "$DIR/../node_modules/.bin/firebase" serve --token "$(cat "$DIR/../keys.json" | jq -r .firebaseToken)" --only functions
