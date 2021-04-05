const {getConfigBuilder} = require("./config-tw5-plugins");

module.exports = (...args) => {
    const config = getConfigBuilder({
        input: 'src/frontend/preboot/main.ts',
        outputDir: 'dist/preboot',
        outputFilename: 'main.js'})(...args);
    config.output.library.type = 'window';
    return config;
};
