#!/usr/bin/env bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
# set up env
. "$DIR/env.sh"

[[ ${DEBUG} ]] && NODE_FLAGS="--inspect-brk" || NODE_FLAGS=""

pushd "$DIR/.."
node $NODE_FLAGS -r source-map-support/register node_modules/.bin/jasmine 'dist/tests/**/*.spec.js'
popd
