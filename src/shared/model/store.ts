import { Revision } from "./revision";
import { PartialTiddlerData, Tiddler, TiddlerNamespace } from "./tiddler";

export type NamespacedTiddler = {
  namespace: TiddlerNamespace;
  title: string;
  value: Tiddler;
  revision: Revision;
};
export type TiddlerUpdateOrCreate =
  | { create: PartialTiddlerData }
  | { update: PartialTiddlerData; expectedRevision: Revision };


export type SingleWikiNamespacedTiddler = {
  bag: string
  tiddler: Tiddler;
  revision: Revision;
};

export interface BoundTiddlerStore {
  removeFromBag: (bag: string, title: string, expectedRevision: string) => Promise<boolean>;
  writeToRecipe: (recipe: string, title: string, updateOrCreate: TiddlerUpdateOrCreate) => Promise<SingleWikiNamespacedTiddler>;
  writeToBag: (bag: string, title: string, updateOrCreate: TiddlerUpdateOrCreate) => Promise<SingleWikiNamespacedTiddler>;
  readFromRecipe: (recipe: string, title?: string) => Promise<SingleWikiNamespacedTiddler | SingleWikiNamespacedTiddler[]>;
  readFromBag(bag: string, title?: string): Promise<SingleWikiNamespacedTiddler | SingleWikiNamespacedTiddler[]>;
}

export const getTiddlerData = (updateOrCreate:TiddlerUpdateOrCreate):PartialTiddlerData => 'create' in updateOrCreate ? updateOrCreate.create : updateOrCreate.update;
export const getExpectedRevision = (updateOrCreate:TiddlerUpdateOrCreate):Revision|undefined => 'update' in updateOrCreate ? updateOrCreate.expectedRevision : undefined;
