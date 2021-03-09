#!/usr/bin/env bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
# set up env
. "$DIR/env.sh"

# build

"$DIR/build.sh"

# create functions/package.json
jq -s '.[0] * {dependencies: .[1].dependencies}' "$DIR/../functions/package.json.base" "$DIR/../package.json" > "$DIR/../functions/package.json"

# run firebase cli deploy command
TARGETS="$(cat "$DIR/../etc/config.json" | jq -r ".deploy.targets")"
"$DIR/build.sh"
firebase_cli deploy --only "$TARGETS"
