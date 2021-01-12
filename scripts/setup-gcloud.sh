#!/usr/bin/env bash

# Script to set up GCP credentials for working with tools like gsutil.
# Usage: $. ./setup-gcloud.sh

# set up env
. "./env.sh"

export CLOUDSDK_CONFIG="$(mktemp -d)"
pushd "$DIR"
gcloud auth activate-service-account --key-file="$SERVICE_ACCOUNT_KEY" --project="$PROJECT"
popd
