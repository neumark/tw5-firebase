import { User } from '@tw5-firebase/shared/model/user';
import {, VARIABLE_PERSONAL_BAG } from '@tw5-firebase../../constants';
import { , Recipe, Recipes, NamespacedRecipe } from '../../shared/src/model/recipe';

import { AccessType, personalBag } from '../../shared/src/model/bag-policy';


export const resolveRecipe = (user: User, accessType: AccessType, recipe: Recipe): string[] {
    return recipe[accessType].map((recipeItem) => {
      if ('bag' in recipeItem) {
        return recipeItem.bag;
      }
      switch (recipeItem.variable) {
        case VARIABLE_PERSONAL_BAG:
          return personalBag(user);
        default:
          throw new Error(`Unexpected recipe variable: ${JSON.stringify(recipeItem)}`);
      }
    });
  }

}
