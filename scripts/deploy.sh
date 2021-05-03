#!/usr/bin/env bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
# set up env
. "$DIR/env.sh"

# build

"$DIR/build.sh"

# run firebase cli deploy command
TARGETS="$(cat "$DIR/../etc/config.$ENV.json" | jq -r ".deploy.targets")"
firebase_cli deploy --only "$TARGETS"
