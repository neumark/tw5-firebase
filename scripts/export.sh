#!/usr/bin/env bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
ID_TOKEN="$($DIR/gettoken.sh)"
HOST="$(cat "$DIR/../etc/config.json" | jq -r ".apiEndpoint")"
node "$DIR/../src/backup2.js" "$HOST" "$ID_TOKEN" $@
