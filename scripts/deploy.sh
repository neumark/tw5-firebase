#!/usr/bin/env bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
# set up env
. "$DIR/env.sh"

firebase_cli deploy --only hosting:pn-wiki,functions:wiki,firestore:rules,storage:rules
