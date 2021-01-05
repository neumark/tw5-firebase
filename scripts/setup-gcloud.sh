#!/usr/bin/env bash

# Script to set up GCP credentials for working with tools like gsutil.
# Usage: $. ./setup-gcloud.sh

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
# set up env
. "$DIR/env.sh"

export CLOUDSDK_CONFIG="$(mktemp -d)"
pushd "$DIR"
gcloud auth activate-service-account --key-file="$SERVICE_ACCOUNT_KEY" --project="$PROJECT"
popd
