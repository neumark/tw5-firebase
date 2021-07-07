import { MaybeArray } from '../util/useful-types';
import { Revision } from './revision';
import { PartialTiddlerData, Tiddler } from './tiddler';

export type SingleWikiNamespacedTiddler = {
  bag: string;
  tiddler: Tiddler;
  revision: Revision;
};

export interface BagApi {
  create: (bag: string, title: string, tiddlerData: PartialTiddlerData) => Promise<SingleWikiNamespacedTiddler>;
  read(bag: string, title?: string): Promise<MaybeArray<SingleWikiNamespacedTiddler>>;
  update: (
    bag: string,
    title: string,
    tiddlerData: PartialTiddlerData,
    expectedRevision: Revision,
  ) => Promise<SingleWikiNamespacedTiddler>;
  del: (bag: string, title: string, expectedRevision: string) => Promise<boolean>;
}
