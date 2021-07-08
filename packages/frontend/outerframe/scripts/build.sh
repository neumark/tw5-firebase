#!/usr/bin/env bash
set -e
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

. "$DIR/../../../../scripts/env.sh"
MODE="${MODE:-"production"}"
MODE="$MODE" BUILD_CONFIG="$BUILD_CONFIG" yarn run build
