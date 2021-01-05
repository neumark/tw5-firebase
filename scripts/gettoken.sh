#!/usr/bin/env bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
# set up env
. "$DIR/env.sh"

# APIKEY is "Browser Key" at eg: https://console.developers.google.com/apis/credentials?pli=1&project=peterneumark-com&folder=&organizationId=
ID_TOKEN="$(curl --referer "$REFERRER" -s -X POST "https://securetoken.googleapis.com/v1/token?key=$APIKEY" -H 'Content-Type: application/x-www-form-urlencoded' -d "grant_type=refresh_token&refresh_token=$REFRESH_TOKEN" | jq -r ".id_token")"
echo $ID_TOKEN
