#!/usr/bin/env bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
# set up env
. "$DIR/env.sh"

BUCKET="$(cat "$CONFIGPATH" | jq -r ".firebase.storageBucket")"
TMPFILE="$(mktemp)"
jq -s '.[0][0] * {"origin": .[1].deployment.allowedDomains} | [.]' "$DIR/../etc/cors-base.json" "$DIR/../etc/testwiki/backend-config.json" > "$TMPFILE"
"$DIR/gcloud-shell.sh" gsutil cors set "$TMPFILE" "gs://$BUCKET"
rm  "$TMPFILE"
