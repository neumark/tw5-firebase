#!/usr/bin/env bash
set -e
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
. "$DIR/../../../shared/scripts/env.sh"

# build backend (firebase functions)
yarn run webpack --stats-error-details --config webpack.config.js
# create functions/package.json
#jq -s '.[0] * {dependencies: .[1].dependencies}' "$DIR/../functions/package.json.base" "$DIR/../package.json" > "$DIR/../functions/package.json"
