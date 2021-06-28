#!/usr/bin/env bash

# Script to set up GCP credentials for working with tools like gsutil.
# Usage: $. ./gcloud-shell.sh

set -e
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

# set up env
. "$DIR/env.sh"

CLOUDSDK_CONFIG="$(mktemp -d)"
pushd "$DIR"
if (( $# > 0 ))
then
    CLOUDSDK_CONFIG="$CLOUDSDK_CONFIG" bash -c "gcloud auth activate-service-account --key-file=$SERVICE_ACCOUNT_KEY --project=$PROJECT;$*"
else
    CLOUDSDK_CONFIG="$CLOUDSDK_CONFIG" bash --init-file <(echo "gcloud auth activate-service-account --key-file=$SERVICE_ACCOUNT_KEY --project=$PROJECT")
fi
popd
rm -rf "$CLOUDSDK_CONFIG"
