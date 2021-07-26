import { asyncMainWrapper } from '../util/async-main';
import yargs from 'yargs';
import { getValidator } from '../util/validator';
import { Schema } from 'ajv';
import path from 'path';

const read = (filename:string) => require(path.resolve(filename));

asyncMainWrapper(module, async () => {
  const args = yargs(process.argv.slice(2))
    .strict()
    .usage('Usage: $0 [options]')
    .options({
      schema: { type: 'string', demandOption: true, describe: 'json schema file' },
      data: { type: 'string', demandOption: true, describe: 'json data file' },
      definition: { type: 'string', demandOption: false, describe: 'definition to use within schema' },
    }).argv;
  const result = getValidator(
    read(args.schema) as Schema,
    args.definition
  )(read(args.data));
  if (!result.valid) {
    process.exitCode = 1;
    console.error(JSON.stringify(result.errors, null, 4));
  }
});
