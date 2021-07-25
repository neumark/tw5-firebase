#!/usr/bin/env bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
# set up env, note that this overwrites $DIR
. "$DIR/../../../shared/scripts/env.sh"

firebase_cli emulators:start --only functions --inspect-functions
