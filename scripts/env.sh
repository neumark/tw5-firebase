#!/usr/bin/env bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

# APIKEY is "Browser Key" at eg: https://console.developers.google.com/apis/credentials?pli=1&project=peterneumark-com&folder=&organizationId=
APIKEY="$(cat "$DIR/../etc/config.json" | jq -r ".firebase.apiKey")"
PROJECT="$(cat "$DIR/../etc/config.json" | jq -r ".firebase.projectId")"
REFERRER="$(cat "$DIR/../etc/config.json" | jq -r ".firebase.authDomain")"
TOKEN="$(cat "$DIR/../etc/keys.json" | jq -r .firebaseToken)"
REFRESH_TOKEN="$(cat "$DIR/../etc/keys.json" | jq -r .refreshToken)"
SERVICE_ACCOUNT_KEY="$DIR/../etc/service-account-key.json"

FIREBASECLI="$DIR/../node_modules/.bin/firebase"
TIDDLYWIKICLI="$DIR/../node_modules/.bin/tiddlywiki"

NODE_FLAGS="$( [[ ${DEBUG} ]] && echo "--inspect-brk" )"

function firebase_cli() {
    GOOGLE_APPLICATION_CREDENTIALS="$SERVICE_ACCOUNT_KEY" node $NODE_FLAGS "$FIREBASECLI" --project "$PROJECT" --token "$TOKEN" $@
}

function tiddlywiki_cli() {
    TIDDLYWIKI_PLUGIN_PATH="$DIR/../plugins" node $NODE_FLAGS "$TIDDLYWIKICLI" $@ --verbose 
}
