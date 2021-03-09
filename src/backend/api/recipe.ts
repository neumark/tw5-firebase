import { personalBag } from './bag';
import {getConstraintChecker} from './tw';
const { GLOBAL_CONTENT_BAG, GLOBAL_SYSTEM_BAG, GLOBAL_RECIPE_BAG, DEFAULT_RECIPE } = require('./constants');
const { getContentValidatingReader } = require('./persistence');
const { recipeSchema } = require('./schema');

const defaultRecipe = user => ([personalBag(user), GLOBAL_SYSTEM_BAG, GLOBAL_CONTENT_BAG]);

const readRecipe = getContentValidatingReader(recipeSchema);

const resolveRecipe = (db, transaction, wiki, recipe, user) => recipe === DEFAULT_RECIPE ? defaultRecipe(user) : readRecipe(db, transaction, wiki, GLOBAL_RECIPE_BAG, recipe, []);

module.exports = { resolveRecipe };
