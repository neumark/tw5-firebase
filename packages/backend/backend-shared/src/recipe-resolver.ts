import { User } from '@tw5-firebase/shared/src/model/user';
import {VARIABLE_PERSONAL_BAG } from '@tw5-firebase/shared/src/constants';
import { Recipe, RecipeItem, DEFAULT_RECIPE, BagAccess, ResolvedRecipe } from '@tw5-firebase/shared/src/model/recipe';
import { personalBag, DEFAULT_BAG_POLICIES, AccessType, BagPolicy, getPersonalBagPolicy } from '@tw5-firebase/shared/src/model/bag-policy';
import { ROLE } from '@tw5-firebase/shared/src/model/roles';
import { verifyHasAccess } from './policy-checker';
import { assertUnreachable } from '@tw5-firebase/shared/src/util/switch';
import { objMerge } from '@tw5-firebase/shared/src/util/map';
import { TW5FirebaseError, TW5FirebaseErrorCode } from '@tw5-firebase/shared/src/model/errors';

const resolveBag = (user:User, recipeItem:RecipeItem):{bag:string, policy:BagPolicy} => {
  if ('bag' in recipeItem) {
    return {bag: recipeItem.bag, policy: DEFAULT_BAG_POLICIES[recipeItem.bag]}
  }
  switch (recipeItem.variable) {
    case VARIABLE_PERSONAL_BAG:
      return {bag: personalBag(user), policy: getPersonalBagPolicy(user.userId)};
    default:
      throw new Error(`Unexpected recipe variable: ${JSON.stringify(recipeItem)}`);
  }
}

const DEFAULT_BAG_ACCESS:BagAccess = 'mandatory';

const resolveRecipeItem = (user:User, role:ROLE, recipeItem:RecipeItem) => {
  const result:Partial<Record<AccessType, string>> = {};
  const {bag, policy} = resolveBag(user, recipeItem);
  for (let accessType of ['read', 'write'] as AccessType[]) {
    const hasAccess = verifyHasAccess(user, role, accessType, policy);
    const requiredAccess = recipeItem[accessType] || DEFAULT_BAG_ACCESS;
    switch (requiredAccess) {
      case 'mandatory':
        if (!hasAccess) {
          // throw exception
          throw new TW5FirebaseError({
            code: TW5FirebaseErrorCode.RECIPE_MANDATORY_BAG_NO_ACCESS,
            data: {
              accessType,
              bag
            },
          });
        }
        result[accessType] = bag;
        break;
      case 'optional':
        if (hasAccess) {
          result[accessType] = bag;
        }
        break;
      case 'none':
        // omit bag from result regardless of hasAccess value
        continue;
      default:
        assertUnreachable(requiredAccess);
    }
  }
  return result;
}

const resolveRecipe = (user:User, role:ROLE, recipe:Recipe):ResolvedRecipe => {
  const resolved = recipe.map(recipeItem => resolveRecipeItem(user, role, recipeItem));
  return objMerge<AccessType, string>(resolved as Record<AccessType, string>[], {
    read: [],
    write: []
  });
}

export const resolveDefaultRecipe = (user: User, role:ROLE): ResolvedRecipe => resolveRecipe(user, role, DEFAULT_RECIPE);
