#!/usr/bin/env bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
# set up env
. "$DIR/env.sh"

pushd "$DIR/.."
# build jsonschema (required by backend build)
"$DIR/../scripts/build-jsonschema.sh"
# build backend (firebase functions)
yarn run webpack --mode development --config build/webpack.functions.config.js
# create functions/package.json
jq -s '.[0] * {dependencies: .[1].dependencies}' "$DIR/../functions/package.json.base" "$DIR/../package.json" > "$DIR/../functions/package.json"
popd
