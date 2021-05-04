import { readFileSync } from "fs";
import { Container } from "inversify";
import { Arguments, Argv, CommandModule } from "yargs";
import { TiddlerStoreFactory } from "../backend/api/tiddler-store";
import { Component } from "../backend/common/ioc/components";
import { ROLE } from "../shared/model/roles";
import { Tiddler } from "../shared/model/tiddler";
import { User } from "../shared/model/user";
import { ObjectOf } from "../shared/util/useful-types";

const DEFAULT_BAG = "content";

const superAdmin = (wiki: string): User => ({
  userId: "superadmin",
  roles: { [wiki]: ROLE.admin },
  email: `superadmin@${wiki}`,
});

const readFile = (f: string) => JSON.parse(readFileSync(f, "utf-8"));

export const getCommandModules = (
  container: Container
): ObjectOf<CommandModule> => {
  return {
    importTiddlers: {
      command: "import <tiddlers..>",
      describe: "import json files(s) containing tiddlers",
      builder: (argv: Argv) =>
        argv.positional("tiddlers", {
          describe: "JSON file(s) with tiddlers",
          type: "string",
        }),
      handler: async (args: Arguments) => {
        const tiddlerStore = container
          .get<TiddlerStoreFactory>(Component.TiddlerStoreFactory)
          .createTiddlerStore(
            superAdmin(args.wiki as string),
            args.wiki as string
          );
        // TODO: validation
        const allTiddlers = (args.tiddlers as string[]).reduce(
          (acc, tiddlerFile) => acc.concat(readFile(tiddlerFile)),
          [] as Tiddler[]
        );
        for (let tiddler of allTiddlers) {
          tiddlerStore.writeToBag(DEFAULT_BAG, tiddler.title, {
            create: tiddler,
          });
        }
      },
    },
  };
};
