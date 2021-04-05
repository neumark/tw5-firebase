import { Revision } from "./revision";
import { Tiddler, TiddlerData, TiddlerNamespace } from "./tiddler";

export type NamespacedTiddler = {
  namespace: TiddlerNamespace;
  key: string;
  value: Tiddler;
  revision: Revision;
};
export type TiddlerUpdateOrCreate =
  | { create: Partial<TiddlerData> }
  | { update: Partial<TiddlerData>; expectedRevision: Revision };


export type SingleWikiNamespacedTiddler = {
  bag: string
  tiddler: Tiddler;
  revision: Revision;
};

export interface BoundTiddlerStore {
  removeFromBag: (bag: string, key: string, expectedRevision: string) => Promise<boolean>;
  writeToRecipe: (recipe: string, key: string, updateOrCreate: TiddlerUpdateOrCreate) => Promise<SingleWikiNamespacedTiddler>;
  writeToBag: (bag: string, key: string, updateOrCreate: TiddlerUpdateOrCreate) => Promise<SingleWikiNamespacedTiddler>;
  readFromRecipe: (recipe: string, key?: string) => Promise<SingleWikiNamespacedTiddler | SingleWikiNamespacedTiddler[]>;
  readFromBag(bag: string, key?: string): Promise<SingleWikiNamespacedTiddler | SingleWikiNamespacedTiddler[]>;
}

export const getTiddlerData = (updateOrCreate:TiddlerUpdateOrCreate):Partial<TiddlerData> => 'create' in updateOrCreate ? updateOrCreate.create : updateOrCreate.update;
export const getExpectedRevision = (updateOrCreate:TiddlerUpdateOrCreate):Revision|undefined => 'update' in updateOrCreate ? updateOrCreate.expectedRevision : undefined;
