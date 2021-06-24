#!/usr/bin/env bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
# set up env
. "$DIR/env.sh"

yarn -s run browserslist --json "$(cat "$DIR/../build/browserslist-query.txt")" | jq .browsers > "$DIR/../build/supported_browsers.json"
