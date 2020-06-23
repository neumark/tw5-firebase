#!/usr/bin/env bash
DIR="$(dirname "${BASH_SOURCE%/*}")"
GOOGLE_APPLICATION_CREDENTIALS="$DIR/../service-account-key.json" node "$DIR/../node_modules/.bin/firebase" --token "$(cat "$DIR/../keys.json" | jq -r .firebaseToken)" emulators:start --only functions --inspect-functions
