#!/usr/bin/env bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
pushd "$DIR/../functions"
FIREBASECLI="$DIR/../node_modules/.bin/firebase"
TOKEN="$(cat "$DIR/../etc/keys.json" | jq -r .firebaseToken)"
GOOGLE_APPLICATION_CREDENTIALS="$DIR/../etc/service-account-key.json" node "$FIREBASECLI" --token "$TOKEN" emulators:start --only functions --inspect-functions
popd
