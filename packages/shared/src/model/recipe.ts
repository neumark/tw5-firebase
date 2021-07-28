import { AccessType } from './bag-policy';
import { BUILTIN_BAG_CONTENT, BUILTIN_BAG_ETC, BUILTIN_BAG_SYSTEM, VARIABLE_PERSONAL_BAG } from '../constants';

/**
 * BagAccess specifices how a bag referenced in a Recipe should be accessed for read/write operations.
 * * `mandatory` - The bag must be accessible by the current user, if it is not, the recipe resolution fails.
 * * `optional` - The bag will be left out of the read / write bags list in the resulting `ResolvedRecipe` if the user does not have access.
 * * `none` - The bag should not be present in `ResolvedRecipe`. Used for read-only / write-only bags.
 */
export type BagAccess = 'mandatory' | 'optional' | 'none';
type RecipeItemCommon = Partial<Record<AccessType, BagAccess>>;

/**
 * A recipe is a list of bags to write to.
 * A recipeItem defines a single b
 */
export type RecipeItem = RecipeItemCommon & ( { bag: string } | { variable: string });

export type Recipe = RecipeItem[];

export const DEFAULT_RECIPE: Recipe =
  [
    { variable: VARIABLE_PERSONAL_BAG },
    { bag: BUILTIN_BAG_ETC, read: 'optional' },
    { bag: BUILTIN_BAG_CONTENT },
    { bag: BUILTIN_BAG_SYSTEM },
  ];

// a resolved recipe is just a list of bags
export type ResolvedRecipe = Record<AccessType, string[]>;

export interface NamespacedRecipe {
  wiki: string;
  recipe: string;
}
