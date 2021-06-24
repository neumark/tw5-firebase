#!/usr/bin/env bash
# exit when any command fails
set -e
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
# set up env
. "$DIR/env.sh"

# generate config
ENV="$ENV" node "$DIR/../build/configbuilder.js" "$DIR/../etc/config.$ENV.json" > "$DIR/../generated/config/config.json"

# validate generatd config
yarn run ajv validate -s "$DIR/../generated/jsonschema/config.json" -d "$DIR/../generated/config/config.json"


