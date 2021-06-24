#!/usr/bin/env bash

# inspired by: https://davidalfonso.es/posts/migrating-from-tiddlywiki-to-markdown-files
# and https://www.didaxy.com/exporting-static-sites-from-tiddlywiki-part-5

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
# set up env
. "$DIR/env.sh"

FIREBASE_CONFIG="$FIREBASECONFIGPATH" GCLOUD_PROJECT="$PROJECT" GOOGLE_APPLICATION_CREDENTIALS="$SERVICE_ACCOUNT_KEY" CONFIGPATH="$CONFIGPATH" node $NODE_FLAGS "$DIR/../dist/cli.js" $@
