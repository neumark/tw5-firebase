const { personalBag } = require('./tw');

const GLOBAL_CONTENT_BAG = "content";
const GLOBAL_SYSTEM_BAG = "system";
const GLOBAL_RECIPE_BAG = "recipes";

const defaultRecipe = email => ([personalBag(email), GLOBAL_SYSTEM_BAG, GLOBAL_CONTENT_BAG]);

module.exports = { defaultRecipe };
