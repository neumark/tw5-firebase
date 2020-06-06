#!/usr/bin/env bash
gcloud config set project peterneumark-com
gcloud firestore export gs://peterneumark-com.appspot.com
