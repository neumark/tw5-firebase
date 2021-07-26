#!/usr/bin/env bash
set -e
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
. "$DIR/../../../shared/scripts/env.sh"
MODE="${MODE:-"production"}"
pushd "$DIR/.."
MODE="$MODE" BUILD_CONFIG="$(read_json "$ETCDIR/$ENV/outer-frame-build.json" "$CONFIGSCHEMA" OuterFrameBuildConfig)" yarn run webpack -c webpack.config.js --mode production
cp -r public/* ../dist
popd
