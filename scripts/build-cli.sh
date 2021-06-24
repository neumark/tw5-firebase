#!/usr/bin/env bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
# set up env
. "$DIR/env.sh"

"$DIR/build-prerequisites.sh"

pushd "$DIR/.."
# build backend (firebase functions)
yarn run webpack --config build/webpack.cli.js
popd
