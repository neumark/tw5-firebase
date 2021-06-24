#!/usr/bin/env bash
set -e
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
# set up env
. "$DIR/env.sh"

"$DIR/build-prerequisites.sh"

pushd "$DIR/.."
# build all frontend assets
yarn run webpack -c build/webpack.frontend.js --mode production

# move sourcemaps to public/sourcemaps
mkdir -p public/sourcemaps
find dist -type f -name '*.js.map' -exec mv '{}' public/sourcemaps \;

# copy plugin infos
for i in $(find "src/frontend/tw5/plugins" -name 'plugin.info' -type f)
do
    cp "$i" "dist/plugins/tw5-firebase/$(echo $i | cut -d / -f 5- )"
done

# build tiddlywiki all-in-one html
TIDDLYWIKICLI="$DIR/../node_modules/.bin/tiddlywiki"
tiddlywiki_cli "$DIR/../editions/spabuilder" --output "$DIR/../dist" --load "$DIR/../dist/preboot/main.js" --build spa 
# copy tw5.html to public/
cp dist/tw5.html public/index.html

popd
