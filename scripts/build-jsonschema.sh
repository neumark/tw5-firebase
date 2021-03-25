#!/usr/bin/env bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
# set up env
. "$DIR/env.sh"

pushd "$DIR/.."
yarn run ts-json-schema-generator -o generated/jsonschema/tiddlerdata.json --path src/shared/model/tiddler.ts --type 'PartialTiddlerData'
yarn run ts-json-schema-generator -o generated/jsonschema/bag-policy.json --path src/shared/model/bag-policy.ts  --type 'BagPolicy'
yarn run ts-json-schema-generator -o generated/jsonschema/role-assignment.json --path src/shared/model/roles.ts  --type 'RoleAssignment'
yarn run ts-json-schema-generator -o generated/jsonschema/recipes.json --path src/shared/model/recipe.ts  --type 'Recipes'

popd
