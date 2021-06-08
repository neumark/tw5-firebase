const path = require('path');
const glob = require('glob');
const {getNodeConfig} = require('./webpack-common');
const outputDir = path.resolve(__dirname, '../dist');
const testFiles = glob.sync(`tests/**/*.spec.*`, {cwd: path.resolve(__dirname, '..')});
const getOutputFilename = inputFilename => {
    const parts = inputFilename.split(".");
    parts[parts.length - 1] = "js";
    return parts.join(".");
};
console.log(testFiles)

module.exports = testFiles.map(input => getNodeConfig({
        input,
        outputDir,
        outputFilename: getOutputFilename(input)}));
