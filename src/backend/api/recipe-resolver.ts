import { inject, injectable } from "inversify";
import { User } from "../../shared/model/user";
import { BUILTIN_BAG_SYSTEM, DEFAULT_RECIPE, RECIPES_TIDDLER, VARIABLE_PERSONAL_BAG } from "../../constants";
import { defaultRecipe, Recipe, Recipes, NamespacedRecipe } from "../../shared/model/recipe";
import { Component } from "../common/ioc/components";
import { StandardTiddlerPersistence } from "../common/persistence/interfaces";
import { TiddlerValidator, TiddlerValidatorFactory } from "../common/persistence/tiddler-validator-factory";
import { recipesSchema } from "../common/schema";
import { AccessType, personalBag } from "../../shared/model/bag-policy";

@injectable()
export class RecipeResolver {

  private recipesValidator: TiddlerValidator<Recipes>;

  private async getRecipe(persistence:StandardTiddlerPersistence, namespacedRecipe:NamespacedRecipe):Promise<Recipe|undefined> {
    // default recipe is built-in, does not require tiddler read
    if (namespacedRecipe.recipe === DEFAULT_RECIPE) {
      return defaultRecipe;
    }
    const recipes = await this.recipesValidator.read(persistence, [{
      namespace: {wiki: namespacedRecipe.wiki, bag: BUILTIN_BAG_SYSTEM},
      key: RECIPES_TIDDLER
    }]);
    if (recipes.length > 0 && recipes[0].value) {
      return recipes[0].value?.[namespacedRecipe.recipe];
    }
    return undefined;
  }

  private resolveRecipe(user: User, accessType: AccessType, recipe: Recipe): string[] {
    return recipe[accessType].map(recipeItem => {
      if ('bag' in recipeItem) {
        return recipeItem.bag;
      }
      switch(recipeItem.variable) {
        case VARIABLE_PERSONAL_BAG:
          return personalBag(user);
        default:
          throw new Error(`Unexpected recipe variable: ${JSON.stringify(recipeItem)}`);
      }
    })
  }

  constructor(
    @inject(Component.TiddlerValidatorFactory) validatorFactory: TiddlerValidatorFactory
  ) {

    this.recipesValidator = validatorFactory.getValidator<Recipes>(recipesSchema);
  }

  async getRecipeBags(user:User, accessType: AccessType, persistence:StandardTiddlerPersistence, namespacedRecipe:NamespacedRecipe):Promise<string[]|undefined> {
    const recipe = await this.getRecipe(persistence, namespacedRecipe);
    if (recipe) {
      return this.resolveRecipe(user, accessType, recipe);
    }
    return undefined;
  }
}