#!/usr/bin/env bash
# exit when any command fails
set -e
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
# set up env
. "$DIR/env.sh"

# validate config
yarn run ajv validate -s "$DIR/../generated/jsonschema/config.json" -d "$DIR/../etc/config.$ENV.json"

# copy config
cp "$DIR/../etc/config.$ENV.json" "$DIR/../generated/config/config.json"

