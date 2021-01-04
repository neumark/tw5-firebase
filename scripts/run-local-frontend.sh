#!/usr/bin/env bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
ENDPOINT="$(cat "$DIR/../functions/firebase-debug.log" | grep 'http function initialized' | cut -d '(' -f 2 | cut -d ')' -f 1 | sed "s/.app/-app/")"
pushd "$DIR/.."
#open 'http://localhost:8080/?apiEndpoint=http%3A%2F%2Flocalhost%3A5001%2Fpeterneumark-com%2Feurope-west3%2Fwiki-app%2F'
open "http://localhost:8080/?apiEndpoint=$ENDPOINT/"
yarn run http-server
popd
