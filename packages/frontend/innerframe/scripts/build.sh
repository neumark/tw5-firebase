#!/usr/bin/env bash
set -e
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
. "$DIR/../../../shared/scripts/env.sh"
MODE="${MODE:-"production"}"
pushd "$DIR/.."
MODE="$MODE" yarn run webpack -c webpack.config.js --mode production
cp dist/sourcemaps/* ../dist/sourcemaps/
tiddlywiki_cli "../../../editions/spabuilder" --output "../dist" --load "dist/inner-main.js" --build spa
popd
