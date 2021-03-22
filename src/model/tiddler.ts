import { Modify } from '../util/modify';

export type TiddlerFields = { [key: string]: string };

export type Revision=string;

// Standard internal representation
export interface Tiddler {
  created: Date;
  creator: string;
  modified: Date;
  modifier: string;
  revision?: Revision;
  tags?: string[];
  text?: string;
  title: string;
  type: string;
  fields?: TiddlerFields;
}

// Override Date fields as strings in serialized version
export type HTTPSerializedTiddler = Modify <Tiddler, {
  // Fields considered mandatory in Tiddler are optional over the wire:
  created?: string;
  modified?: string;
  creator?: string;
  modifier?: string;
  type?: string;
  bag?: string;
}>;

export interface TiddlerNamespace {
  wiki: string,
  bag: string
}