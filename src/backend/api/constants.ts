export const ROLES_TIDDLER = "$:/roles";
export const POLICY_TIDDLER = "policy";
export const PERSONAL_TIDDLERS = new Set(['$:/StoryList', '$:/HistoryList', '$:/DefaultTiddlers']);
export const PERSONAL_TAG = "personal";

export const GLOBAL_CONTENT_BAG = "content";
export const GLOBAL_SYSTEM_BAG = "system";
export const GLOBAL_RECIPE_BAG = "recipes";

export const DEFAULT_RECIPE = "default";

export const DEFAULT_TIDDLER_TYPE = "text/vnd.tiddlywiki";

export const CONTENT_TIDDLER_TYPES = new Set([
        DEFAULT_TIDDLER_TYPE,
        "text/markdown",
        "text/x-markdown",
        "application/x-tiddler",
        "application/x-tiddlers",
        "text/plain",
        "text/css",
        "application/json",
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/heic",
        "image/heif",
        "image/svg+xml",
        "image/x-icon"]);

export const SYSTEM_TITLE_PREFIX = "$:/";