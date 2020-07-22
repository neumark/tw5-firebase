#!/usr/bin/env node
const path = require("path");
const ROOT_DIR = path.resolve(__dirname, "..", "..");
const TW_HOME = path.resolve(ROOT_DIR, "node_modules/tiddlywiki/");
const ADAPTOR_CONFIG = "$:/config/firestore-syncadaptor-client/config";
const fetch = require("node-fetch");
const { loadTiddler } = require(path.resolve(ROOT_DIR, 'plugins/neumark/firestore-syncadaptor-client/core.js'));

const boot = (argv, token, preloadTiddlers) => {
    // set plugin dir env var
    var $tw = require(path.resolve(TW_HOME, "boot/bootprefix.js")).bootprefix();
    require(path.resolve(TW_HOME, "boot/boot.js")).TiddlyWiki($tw);

    // Pass the command line arguments to the boot kernel
    $tw.boot.argv = argv;
    // set initial tiddlers
    $tw._pnwiki = {
        initialTidders: preloadTiddlers,
        getIdToken: () => token,
        fetch
    };

    if (preloadTiddlers) {
        $tw.preloadTiddlerArray(preloadTiddlers);
    }

    // Boot the TW5 app
    return new Promise(resolve => $tw.boot.boot(resolve));
};

const installFetch = () => {
    const fetch = require("node-fetch");
    global.fetch = fetch;
};

const JSONtiddler = (title, data) => ({
    title,
    type: "application/json",
    text: JSON.stringify(data)
});

const init = async (config, token, argv) => {
    const tiddlers = await loadTiddler(config, token);
    return boot(argv, token, [JSONtiddler(ADAPTOR_CONFIG, config), ...tiddlers]);
};

if (require.main === module) {
    const token = process.env.TOKEN;
    const argv = Array.prototype.slice.call(process.argv,2);
    const config = require(path.resolve(ROOT_DIR, 'wiki-config.json'));
    installFetch();
    init(config, token, argv);
}
