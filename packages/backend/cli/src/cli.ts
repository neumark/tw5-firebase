import 'reflect-metadata';
import 'source-map-support/register';
import * as admin from 'firebase-admin';
import yargs from 'yargs';
import { config } from '../backend/config-reader';
import { getCommandModules as getRoleModules } from './roles';
import { getCommandModules as getImportModules } from './import';
import { productionStartup } from '../backend/common/startup';

const container = productionStartup(config['firebase']);

const defaultWiki = config.wiki.wikiName;

const { getrole, setrole, getuser } = getRoleModules(container);
const { importTiddlers } = getImportModules(container);

yargs(process.argv.slice(2))
  .strict()
  .usage('Usage: $0 <command> [options]')
  .alias('w', 'wiki')
  .nargs('w', 1)
  .describe('w', 'name of wiki to operate on')
  .default('w', defaultWiki)
  .command(setrole)
  .command(getrole)
  .command(getuser)
  .command(importTiddlers)
  .example('$0 setrole foo@bar.com admin', 'grant admin role to foo@bar.com on default wiki')
  .example('$0 -w another-wiki getrole foo@bar.com', 'get role assigned to foo@bar.com on another-wiki')
  .help()
  .wrap(80)
  .alias('h', 'help')
  .epilog('Find more help at: https://neumark.github.io/tw5-firebase/')
  .onFinishCommand(async (output) => {
    if (output) {
      console.log(output);
    }
    // node process hangs without this, see: https://stackoverflow.com/a/46177431
    await admin.app().delete();
  })
  .demandCommand().argv;
