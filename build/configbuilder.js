const fs = require('fs');
const path = require('path');

const config = JSON.parse(fs.readFileSync(process.argv[2], 'utf-8'));
const output = {
    deploy: config.deploy,
    wiki: config.wiki,
    firebase: config.firebase,
    build: {
        timestamp: +new Date(),
        env: process.env['ENV']
    }
};
console.log(JSON.stringify(output, null, 4));
