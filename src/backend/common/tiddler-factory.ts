import { inject, injectable } from "inversify";
import { Tiddler } from "../../model/tiddler";
import { User, username } from "../../model/user";
import { DEFAULT_TIDDLER_TYPE } from "../../constants";
import { getTimestamp as _getTimestamp } from "../../util/time";
import { Component } from "./ioc/components";

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
    type?: string
  ): Tiddler {
    const date = this.getTimestamp();
    return {
      created: date,
      creator: username(creator),
      modified: date,
      modifier: username(creator),
      tags: [],
      text: undefined,
      title,
      type: type || DEFAULT_TIDDLER_TYPE,
      fields: {},
    };
  }
}
