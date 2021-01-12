#!/usr/bin/env bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
# set up env
. "$DIR/env.sh"

TARGETS="$(cat "$DIR/../etc/config.json" | jq -r ".deploy.targets")"
# copy config.json
cp "$DIR/../etc/config.json" "$DIR/../functions/config.json"
pushd "$DIR/../functions"
yarn install
popd
firebase_cli deploy --only "$TARGETS"
