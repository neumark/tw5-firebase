#!/usr/bin/env bash
DIR="${BASH_SOURCE%/*}"
# APIKEY is "Browser Key" on https://console.developers.google.com/apis/credentials?pli=1&project=peterneumark-com&folder=&organizationId=
APIKEY="$(cat "$DIR/../keys.json" | jq -r .apikey)"
REFRESH_TOKEN="$(cat "$DIR/../keys.json" | jq -r .refreshToken)"
ID_TOKEN="$(curl -s -X POST "https://securetoken.googleapis.com/v1/token?key=$APIKEY" -H 'Content-Type: application/x-www-form-urlencoded' -d "grant_type=refresh_token&refresh_token=$REFRESH_TOKEN" | jq -r ".id_token")"
HOST="$(cat "$DIR/../tw/tiddlers/_system/config/firestore-syncadaptor-client/host.tid" | grep http)"
node "$DIR/../src/backup2.js" "$HOST" "$ID_TOKEN"
