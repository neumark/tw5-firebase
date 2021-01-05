#!/usr/bin/env bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
# get function endpoint URL from firebase debug log, replace wiki.app with wiki-app in URL.
ENDPOINT="$(cat "$DIR/../functions/firebase-debug.log" | grep 'http function initialized' | cut -d '(' -f 2 | cut -d ')' -f 1 | sed "s/.app/-app/")"
pushd "$DIR/.."
open "http://localhost:8080/?apiEndpoint=$ENDPOINT/"
yarn run http-server
popd
