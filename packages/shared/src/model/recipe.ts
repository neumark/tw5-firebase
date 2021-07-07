import { AccessType } from './bag-policy';
import { BUILTIN_BAG_CONTENT, BUILTIN_BAG_ETC, BUILTIN_BAG_SYSTEM, VARIABLE_PERSONAL_BAG } from '../../../constants';

interface RecipeItemCommon {
  optional?: boolean;
}

type RecipeItem = (RecipeItemCommon & { bag: string }) | (RecipeItemCommon & { variable: string });

export type Recipe = { [key in AccessType]: RecipeItem[] };

export type Recipes = { [recipeName: string]: Recipe };

export const DEFAULT_RECIPE: Recipe = {
  read: [
    { variable: VARIABLE_PERSONAL_BAG },
    { bag: BUILTIN_BAG_CONTENT },
    { bag: BUILTIN_BAG_ETC, optional: true },
    { bag: BUILTIN_BAG_SYSTEM },
  ],
  write: [
    { variable: VARIABLE_PERSONAL_BAG },
    { bag: BUILTIN_BAG_CONTENT },
    { bag: BUILTIN_BAG_ETC, optional: true },
    { bag: BUILTIN_BAG_SYSTEM },
  ],
};

// a resolved recipe is just a list of bags
export type ResolvedRecipe = { [key in AccessType]: string[] };

export interface NamespacedRecipe {
  wiki: string;
  recipe: string;
}
