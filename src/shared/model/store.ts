import { MaybeArray } from '../util/useful-types';
import { Revision } from './revision';
import { PartialTiddlerData, Tiddler } from './tiddler';

export type SingleWikiNamespacedTiddler = {
    bag: string;
    tiddler: Tiddler;
    revision: Revision;
};

export interface TiddlerStore {
    createInBag: (bag: string, title: string, tiddlerData: PartialTiddlerData) => Promise<SingleWikiNamespacedTiddler>;
    readFromBag(bag: string, title?: string): Promise<MaybeArray<SingleWikiNamespacedTiddler>>;
    updateInBag: (
        bag: string,
        title: string,
        tiddlerData: PartialTiddlerData,
        expectedRevision: Revision,
    ) => Promise<SingleWikiNamespacedTiddler>;
    deleteFromBag: (bag: string, title: string, expectedRevision: string) => Promise<boolean>;
    readFromRecipe: (recipe: string, title?: string) => Promise<MaybeArray<SingleWikiNamespacedTiddler>>;
    createInRecipe: (
        recipe: string,
        title: string,
        tiddlerData: PartialTiddlerData,
    ) => Promise<SingleWikiNamespacedTiddler>;
}
