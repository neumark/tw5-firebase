#!/usr/bin/env bash
set -e

MYDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

function read_json() {
    # args are DATA [SCHEMA DEFINITION PATH]
    FILE="$1"
    if [ ! -f "$FILE" ]; then
      echo "Error: $FILE must exist"
      exit 1
    fi
    if (( $# < 2 ))
    then
        cat "$FILE"
    else
        TS_NODE_COMPILER_OPTIONS='{"module":"commonjs"}' yarn workspace @tw5-firebase/shared run ts-node --transpile-only "$MYDIR/../src/cli/validate-cli.ts" --schema "$2" --data "$FILE" --definition "$3"
        cat "$FILE" | jq -r "${4:-.}"
    fi
}

ETCDIR="$MYDIR/../../../etc"
CONFIGSCHEMA="$MYDIR/../generated/jsonschema/config.json"
# default env is defined by default env
ENV="${ENV:-$(read_json "$ETCDIR/config.json" "$CONFIGSCHEMA" TW5FirebaseEnvironmentConfig '.defaultEnv')}"

# firebase config must be in root of project, cannot be placed under etc/
FIREBASESETTINGSPATH="$ETCDIR/../firebase.$ENV.json"
if [ ! -f "$FIREBASESETTINGSPATH" ]; then
  FIREBASESETTINGSPATH="$ETCDIR/../firebase_default.json"
fi

# the JSON file pointed to be the FIREBASE_CONFIG env var is read by firebase-admin
# and it is set by the production cloud function runtime
FIREBASE_CONFIG="$(read_json "$ETCDIR/$ENV/firebase.json" "$CONFIGSCHEMA" FirebaseConfig)"
BACKEND_CONFIG="$(read_json "$ETCDIR/$ENV/backend.json" "$CONFIGSCHEMA" BackendConfig)"

GCP_PROJECT="$(echo "$FIREBASE_CONFIG" | jq -r ".projectId")"
TOKEN="$(read_json "$ETCDIR/$ENV/keys.json" "$CONFIGSCHEMA" Keys '.firebaseToken')"
SERVICE_ACCOUNT_KEY="$ETCDIR/$ENV/service-account-key.json"

[[ ${DEBUG} ]] && NODE_FLAGS="--inspect-brk" || NODE_FLAGS=""

function run_node() {
    yarn node $NODE_FLAGS $@
}

function firebase_cli() {
    pushd "$DIR/../../" > /dev/null
    GOOGLE_APPLICATION_CREDENTIALS="$SERVICE_ACCOUNT_KEY" \
    yarn workspace @tw5-firebase/restapi firebase --config "$FIREBASESETTINGSPATH" --project "$GCP_PROJECT" --token "$TOKEN" $@
    popd > /dev/null
}

function tiddlywiki_cli() {
    TIDDLYWIKI_PLUGIN_PATH="$DIR/../dist/plugins" yarn run tiddlywiki $@ --verbose 
}
