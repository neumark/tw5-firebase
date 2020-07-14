const { personalBag } = require('./tw');
const { getConstraintChecker } = require('./tw');
const { GLOBAL_CONTENT_BAG, GLOBAL_SYSTEM_BAG, GLOBAL_RECIPE_BAG, DEFAULT_RECIPE } = require('./constants');
const { getContentValidatingReader } = require('./persistence');
const { recipeSchema } = require('./schema');

const defaultRecipe = email => ([personalBag(email), GLOBAL_SYSTEM_BAG, GLOBAL_CONTENT_BAG]);

const readRecipe = getContentValidatingReader(recipeSchema);

const resolveRecipe = (transaction, wiki, recipe, user) => recipe === DEFAULT_RECIPE ? defaultRecipe(user.email) : readRecipe(transaction, wiki, GLOBAL_RECIPE_BAG, recipe, []);

module.exports = { resolveRecipe };
