#!/usr/bin/env bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
pushd "$DIR/.."
open 'http://localhost:8080/?host=http%3A%2F%2Flocalhost%3A5001%2Fpeterneumark-com%2Feurope-west3%2Fwiki-app%2F'
yarn run http-server
popd
