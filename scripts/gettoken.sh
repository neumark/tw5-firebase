#!/usr/bin/env bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
# APIKEY is "Browser Key" at eg: https://console.developers.google.com/apis/credentials?pli=1&project=peterneumark-com&folder=&organizationId=
APIKEY="$(cat "$DIR/../etc/keys.json" | jq -r .apikey)"
REFRESH_TOKEN="$(cat "$DIR/../etc/keys.json" | jq -r .refreshToken)"
REFERRER="$(cat "$DIR/../etc/config.json" | jq -r .domain)"
ID_TOKEN="$(curl --referer "$REFERRER" -s -X POST "https://securetoken.googleapis.com/v1/token?key=$APIKEY" -H 'Content-Type: application/x-www-form-urlencoded' -d "grant_type=refresh_token&refresh_token=$REFRESH_TOKEN" | jq -r ".id_token")"
echo $ID_TOKEN
