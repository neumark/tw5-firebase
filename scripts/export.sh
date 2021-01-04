#!/usr/bin/env bash
DIR="${BASH_SOURCE%/*}"
ID_TOKEN="$($DIR/gettoken.sh)"
HOST="$(cat "$DIR/../etc/config.json" | jq -r ".host")"
node "$DIR/../src/backup2.js" "$HOST" "$ID_TOKEN"
