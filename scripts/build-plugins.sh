#!/usr/bin/env bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
# set up env
. "$DIR/env.sh"

# build backend (firebase functions)
yarn run webpack --mode production --config "$DIR/../build/webpack.tw5-plugins.js"
