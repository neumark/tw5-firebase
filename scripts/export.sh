#!/usr/bin/env bash
DIR="${BASH_SOURCE%/*}"
ID_TOKEN="$($DIR/gettoken.sh)"
HOST="$(cat "$DIR/../etc/config.json" | jq -r ".apiEndpoint")"
node "$DIR/../src/backup2.js" "$HOST" "$ID_TOKEN"
