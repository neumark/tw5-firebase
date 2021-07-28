import { Modify } from '../util/useful-types';
import { Revision } from './revision';

export type TiddlerFields = { [key: string]: string };

export interface TiddlerData {
  tags: string[];
  text: string;
  type: string;
  fields: TiddlerFields;
}

export type PartialTiddlerData = Partial<TiddlerData>;

export interface TiddlerMetadata {
  created: Date;
  creator: string;
  modified: Date;
  modifier: string;
}

// Standard internal representation
export type Tiddler = { title: string } & PartialTiddlerData & TiddlerMetadata;

export interface TiddlerNamespace {
  wiki: string;
  bag: string;
}

export type HTTPTiddler = Modify<
  Tiddler,
  {
    created: string;
    modified: string;
  }
>;

export interface HTTPNamespacedTiddler {
  bag: string;
  revision: Revision;
  tiddler: HTTPTiddler;
}

export interface TiddlerWithRevision {
  tiddler: Tiddler;
  revision: Revision;
}
