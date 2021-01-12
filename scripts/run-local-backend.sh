#!/usr/bin/env bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
# set up env
. "$DIR/env.sh"

pushd "$DIR/../functions"
# copy config.json
cp "$DIR/../etc/config.json" "$DIR/../functions/config.json"
firebase_cli  emulators:start --only functions --inspect-functions
popd
