
export type TiddlerFields = { [key: string]: string };

export interface TiddlerData {
  tags: string[];
  text: string;
  type: string;
  fields: TiddlerFields;
}

export type PartialTiddlerData = Partial<TiddlerData>

export interface TiddlerMetadata {
  created: Date;
  creator: string;
  modified: Date;
  modifier: string;
}

// Standard internal representation
export type Tiddler = {title: string} & PartialTiddlerData & TiddlerMetadata

export interface TiddlerNamespace {
  wiki: string,
  bag: string
}