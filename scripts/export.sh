#!/usr/bin/env bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
# set up env
. "$DIR/env.sh"

ID_TOKEN="$($DIR/gettoken.sh)"
API_ENDPOINT="$(cat "$DIR/../etc/config.json" | jq -r ".wiki.apiEndpoint")"
node $NODE_FLAGS "$DIR/../src/backup2.js" "$API_ENDPOINT" "$ID_TOKEN" $@
