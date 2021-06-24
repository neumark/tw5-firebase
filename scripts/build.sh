#!/usr/bin/env bash
set -e
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
# set up env
. "$DIR/env.sh"

pushd "$DIR/.."

"$DIR/build-jsonschema.sh"

"$DIR/build-frontend.sh"

"$DIR/build-backend.sh"

"$DIR/build-cli.sh"

popd
