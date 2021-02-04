#!/usr/bin/env bash
if (( $# != 1 ))
then
  echo "Usage: $0 tiddlers.json"
  exit 1
fi

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
# set up env
. "$DIR/env.sh"

TIDDLYWIKICLI="$DIR/../src/preloader.js"
TOKEN="$($DIR/gettoken.sh)" tiddlywiki_cli "$DIR/../editions/tw-node-firestore" --load $1
