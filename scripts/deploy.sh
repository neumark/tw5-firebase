#!/usr/bin/env bash
DIR="${BASH_SOURCE%/*}"
FIREBASE="$DIR/../node_modules/.bin/firebase"
$FIREBASE deploy --only hosting:pn-wiki,functions:wiki
