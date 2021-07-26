#!/usr/bin/env bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
. "$DIR/../../../shared/scripts/env.sh"
firebase_cli functions:config:set tw5firebase.backendconfig="$(echo "$BACKEND_CONFIG" | jq -c 'with_entries(.value |= tojson)' )"
firebase_cli functions:config:set tw5firebase.firebaseconfig="$(echo "$FIREBASE_CONFIG" | jq -c 'with_entries(.value |= tojson)' )"
# TODO: get function names from deployment.json
firebase_cli deploy --only "functions:wiki,firestore:rules,storage:rules"
