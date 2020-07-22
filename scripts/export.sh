#!/usr/bin/env bash
DIR="${BASH_SOURCE%/*}"
ID_TOKEN="$($DIR/gettoken.sh)"
HOST="$(grep wiki-app $DIR/../public/config.js | cut -d '"' -f 2)"
node "$DIR/../src/backup2.js" "$HOST" "$ID_TOKEN"
