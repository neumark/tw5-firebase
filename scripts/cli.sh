#!/usr/bin/env bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
# set up env
. "$DIR/env.sh"

FIREBASE_CONFIG="$FIREBASECONFIGPATH" GCLOUD_PROJECT="$GCP_PROJECT" GOOGLE_APPLICATION_CREDENTIALS="$SERVICE_ACCOUNT_KEY" CONFIGPATH="$CONFIGPATH" node $NODE_FLAGS "$DIR/../dist/cli.js" $@
