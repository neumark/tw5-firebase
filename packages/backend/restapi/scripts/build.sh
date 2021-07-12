#!/usr/bin/env bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
# set up env, note that this overwrites $DIR
. "$DIR/../../../shared/scripts/env.sh"

# build backend (firebase functions)
yarn run webpack --config webpack.config.js
# create functions/package.json
#jq -s '.[0] * {dependencies: .[1].dependencies}' "$DIR/../functions/package.json.base" "$DIR/../package.json" > "$DIR/../functions/package.json"
