#!/usr/bin/env bash

function read_json() {
    FILE="$1"
    if [ ! -f "$FILE" ]; then
      echo "Error: $FILE must exist"
      exit 1
    fi
    if (( $# < 2 ))
    then
        cat "$FILE"
    else
        shift
        cat "$FILE" | jq -r $*
    fi
}

MYDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
ETCDIR="$MYDIR/../../../etc"
# default env is testwiki
ENV="${ENV:-$(read_json "$ETCDIR/config.json" '.defaultEnv' )}"

# firebase config must be in root of project, cannot be placed under etc/
FIREBASESETTINGSPATH="$ETCDIR/../firebase.$ENV.json"
if [ ! -f "$FIREBASESETTINGSPATH" ]; then
  FIREBASESETTINGSPATH="$ETCDIR/../firebase_default.json"
fi

# the JSON file pointed to be the FRONTEND_CONFIG env var is read by firebase-admin
# and it is set by the production cloud function runtime
FRONTEND_CONFIG="$(read_json "$ETCDIR/$ENV/frontend.json")"
BACKEND_CONFIG="$(read_json "$ETCDIR/$ENV/backend.json")"
BUILD_CONFIG="$(read_json "$ETCDIR/$ENV/build.json")"

APIKEY="$(echo "$FRONTEND_CONFIG" | jq -r ".apiKey")"
GCP_PROJECT="$(echo "$FRONTEND_CONFIG" | jq -r ".projectId")"
REFERRER="$(echo "$FRONTEND_CONFIG" | jq -r ".authDomain")"
TOKEN="$(read_json "$ETCDIR/$ENV/keys.json" '.firebaseToken')"
SERVICE_ACCOUNT_KEY="$ETCDIR/$ENV/service-account-key.json"

[[ ${DEBUG} ]] && NODE_FLAGS="--inspect-brk" || NODE_FLAGS=""

function run_node() {
    yarn node $NODE_FLAGS $@
}

function firebase_cli() {
    pushd "$DIR/../../"
    GOOGLE_APPLICATION_CREDENTIALS="$SERVICE_ACCOUNT_KEY" \
    FRONTEND_CONFIG="$FRONTEND_CONFIG" \
    BACKEND_CONFIG="$BACKEND_CONFIG" \
    yarn workspace @tw5-firebase/restapi firebase --config "$FIREBASESETTINGSPATH" --project "$GCP_PROJECT" --token "$TOKEN" $@
    popd
}

function tiddlywiki_cli() {
    TIDDLYWIKI_PLUGIN_PATH="$DIR/../dist/plugins" yarn run tiddlywiki $@ --verbose 
}
