#!/usr/bin/env bash
set -e
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
. "$DIR/../../../shared/scripts/env.sh"
MODE="${MODE:-"production"}"
pushd "$DIR/.."
MODE="$MODE" \
WIKI_LOCATION="$(read_json "$ETCDIR/$ENV/wiki-location.json" "$CONFIGSCHEMA" WikiLocation)" \
FIREBASE_CONFIG="$FIREBASE_CONFIG" \
yarn run webpack -c webpack.config.js --mode production
cp -r public/* ../dist
popd
