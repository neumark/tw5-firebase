#!/usr/bin/env bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

FIREBASECONFIGPATH="$DIR/../firebase_custom.json"
if [ ! -f "$FIREBASECONFIGPATH" ]; then
  FIREBASECONFIGPATH="$DIR/../firebase_default.json"
fi

CONFIGPATH="$DIR/../etc/config.json"
KEYSPATH="$DIR/../etc/keys.json"

# APIKEY is "Browser Key" at eg: https://console.developers.google.com/apis/credentials?pli=1&project=peterneumark-com&folder=&organizationId=
APIKEY="$(cat "$CONFIGPATH" | jq -r ".firebase.apiKey")"
PROJECT="$(cat "$CONFIGPATH" | jq -r ".firebase.projectId")"
REFERRER="$(cat "$CONFIGPATH" | jq -r ".firebase.authDomain")"
TOKEN="$(cat "$KEYSPATH" | jq -r .firebaseToken)"
REFRESH_TOKEN="$(cat "$KEYSPATH" | jq -r .refreshToken)"
SERVICE_ACCOUNT_KEY="$DIR/../etc/service-account-key.json"

FIREBASECLI="$DIR/../node_modules/.bin/firebase"
TIDDLYWIKICLI="$DIR/../src/preloader.js"

NODE_FLAGS="$( [[ ${DEBUG} ]] && echo "--inspect-brk" )"

function firebase_cli() {
    pushd "$DIR/../"
    GOOGLE_APPLICATION_CREDENTIALS="$SERVICE_ACCOUNT_KEY" node $NODE_FLAGS "$FIREBASECLI" --config "$FIREBASECONFIGPATH" --project "$PROJECT" --token "$TOKEN" $@
    popd
}

function tiddlywiki_cli() {
    TIDDLYWIKI_PLUGIN_PATH="$DIR/../dist/plugins" node $NODE_FLAGS "$TIDDLYWIKICLI" $@ --verbose 
}
