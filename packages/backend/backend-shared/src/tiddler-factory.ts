import { inject, injectable } from 'inversify';
import { PartialTiddlerData, Tiddler } from '../../shared/model/tiddler';
import { User, username } from '../../shared/model/user';
import { DEFAULT_TIDDLER_TYPE } from '../../constants';
import { getTimestamp as _getTimestamp } from '../../shared/util/time';
import { Component } from './ioc/components';

@injectable()
export class TiddlerFactory {
  private getTimestamp: () => Date;
  constructor(@inject(Component.getTimestamp) getTimestamp: typeof _getTimestamp) {
    this.getTimestamp = getTimestamp;
  }

  createTiddler(creator: User, title: string, type?: string, tiddlerData?: PartialTiddlerData): Tiddler {
    const date = this.getTimestamp();
    return Object.assign(
      {
        created: date,
        creator: username(creator),
        modified: date,
        modifier: username(creator),
        tags: [],
        text: undefined,
        title,
        type: type || DEFAULT_TIDDLER_TYPE,
        fields: {},
      },
      tiddlerData,
    );
  }
}
