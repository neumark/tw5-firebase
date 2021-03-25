import { AccessType } from "./bag-policy";
import {BUILTIN_BAG_CONTENT, BUILTIN_BAG_SYSTEM, VARIABLE_PERSONAL_BAG} from '../../constants';

type RecipeItem = {bag: string}|{variable: string};

export type Recipe =  { [key in AccessType]: RecipeItem[] }

export type Recipes = {[recipeName:string]:Recipe};

export const defaultRecipe:Recipe = {
  read: [
    {variable: VARIABLE_PERSONAL_BAG},
    {bag: BUILTIN_BAG_CONTENT},
    {bag: BUILTIN_BAG_SYSTEM},
  ],
  write: [
    {variable: VARIABLE_PERSONAL_BAG},
    {bag: BUILTIN_BAG_CONTENT},
    {bag: BUILTIN_BAG_SYSTEM},
  ]
};

export interface NamespacedRecipe {
  wiki: string,
  recipe: string
}