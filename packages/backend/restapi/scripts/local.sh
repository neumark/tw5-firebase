#!/usr/bin/env bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
. "$DIR/../../../shared/scripts/env.sh"
firebase_cli functions:config:get > "$DIR/../dist/.runtimeconfig.json"
firebase_cli emulators:start --only functions --inspect-functions
