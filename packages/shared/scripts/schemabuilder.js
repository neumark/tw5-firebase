const tsj = require('ts-json-schema-generator');
const fs = require('fs');
const path = require('path');
const schemas = require('../schemas.json');

const relativePath = (f) => path.resolve(__dirname, '..', f);

const tsconfig = relativePath('tsconfig.json');

for (let { input, output, type } of schemas) {
  const config = {
    path: relativePath(input),
    tsconfig,
    type,
  };
  const schema = tsj.createGenerator(config).createSchema(config.type);
  const schemaString = JSON.stringify(schema, null, 2);
  fs.writeFileSync(relativePath(output), schemaString);
}
