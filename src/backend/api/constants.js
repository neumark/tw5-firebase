module.exports = {

    ROLES_TIDDLER: "$:/roles",
    POLICY_TIDDLER: "policy",

    PERSONAL_TIDDLERS: new Set(['$:/StoryList', '$:/HistoryList', '$:/DefaultTiddlers']),
    PERSONAL_TAG: "personal",

    GLOBAL_CONTENT_BAG: "content",
    GLOBAL_SYSTEM_BAG: "system",
    GLOBAL_RECIPE_BAG: "recipes",

    DEFAULT_RECIPE: "default",

    CONTENT_TIDDLER_TYPES: new Set([
        "text/vnd.tiddlywiki",
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
        "image/x-icon"]),

    SYSTEM_TITLE_PREFIX: "$:/",

    ACCESS_READ: "read",
    ACCESS_WRITE: "write"
};
