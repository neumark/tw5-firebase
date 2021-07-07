import { User } from '@tw5-firebase/shared/model/user';
import { BUILTIN_BAG_SYSTEM, DEFAULT_RECIPE_NAME, VARIABLE_PERSONAL_BAG } from '../../constants';
import { DEFAULT_RECIPE, Recipe, Recipes, NamespacedRecipe } from '../../shared/src/model/recipe';
import { Component } from '../../backend/backend-shared/src/ioc/components';
import { TiddlerPersistence } from '../../backend/backend-shared/src/persistence/interfaces';
import { TiddlerValidator, TiddlerValidatorFactory } from '../../backend/backend-shared/src/persistence/tiddler-validator-factory';
import { recipesSchema } from '../../backend/backend-shared/src/schema';
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
