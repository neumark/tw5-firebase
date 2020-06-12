#!/usr/bin/env bash
GOOGLE_APPLICATION_CREDENTIALS=../service-account-key.json ../node_modules/.bin/firebase serve --token "$(cat "../.firebase-token")" --only functions
