import { inject, injectable } from "inversify";
import { Component } from "./ioc/components";
import { getTimestamp as _getTimestamp } from "../../util/time";
import { getRevision } from "../../util/revision";
import { Tiddler } from "src/model/tiddler";
import { User, username } from "src/model/user";
import { DEFAULT_TIDDLER_TYPE } from "../../constants";

@injectable()
export class TiddlerFactory {
  private getTimestamp: () => Date;
  constructor(
    @inject(Component.getTimestamp) getTimestamp: typeof _getTimestamp
  ) {
    this.getTimestamp = getTimestamp;
  }

  createTiddler(
    creator: User,
    title: string,
    type = DEFAULT_TIDDLER_TYPE
  ): Tiddler {
    const date = this.getTimestamp();
    return {
      created: date,
      creator: username(creator),
      modified: date,
      modifier: username(creator),
      revision: getRevision(creator, date),
      tags: [],
      text: undefined,
      title,
      type,
      fields: {},
    };
  }
}
