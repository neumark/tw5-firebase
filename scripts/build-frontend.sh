#!/usr/bin/env bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
# set up env
. "$DIR/env.sh"

pushd "$DIR/.."
# build all frontend assets
yarn run webpack -c build/webpack.frontend.js --mode production
# copy plugin infos
pushd "$DIR/../src/frontend/tw5/plugins/"
for i in $(find . -name 'plugin.info')
do
    cp "$i" "dist/plugins/tw5-firebase/$i"
done
popd

# build tiddlywiki all-in-one html
TIDDLYWIKICLI="$DIR/../node_modules/.bin/tiddlywiki"
tiddlywiki_cli "$DIR/../editions/spabuilder" --output "$DIR/../dist" --load "$DIR/../dist/preboot/main.js" --build spa 
# copy tw5.html to public/
cp dist/tw5.html public/index.html

# copy sourcemaps to public/sourcemaps
mkdir -p public/sourcemaps
find dist -type f -name '*.js.map' -exec cp '{}' public/sourcemaps \;

popd
