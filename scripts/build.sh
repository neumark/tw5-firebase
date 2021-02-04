#!/usr/bin/env bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
# set up env
. "$DIR/env.sh"

# don't use preloader.js because it tries to persist temporary tiddlers to firestore
TIDDLYWIKICLI="$DIR/../node_modules/.bin/tiddlywiki"
tiddlywiki_cli "$DIR/../editions/spabuilder" --output "$DIR/../public" --load "$DIR/../etc/config.json" --build index
