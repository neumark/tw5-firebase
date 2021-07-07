// all of these are deprecated
export const PERSONAL_TIDDLERS = new Set(['$:/StoryList', '$:/HistoryList', '$:/DefaultTiddlers']);
export const PERSONAL_TAG = 'personal';
export const PERSONAL_BAG_PREFIX = 'user:';

export const BUILTIN_BAG_CONTENT = 'content';
export const BUILTIN_BAG_ETC = 'etc';
export const BUILTIN_BAG_SYSTEM = 'system';

export const DEFAULT_RECIPE_NAME = 'default';

export const DEFAULT_TIDDLER_TYPE = 'text/vnd.tiddlywiki';
export const JSON_TIDDLER_TYPE = 'application/json';

export const CONTENT_TIDDLER_TYPES = new Set([
  DEFAULT_TIDDLER_TYPE,
  JSON_TIDDLER_TYPE,
  'text/markdown',
  'text/x-markdown',
  'application/x-tiddler',
  'application/x-tiddlers',
  'text/plain',
  'text/css',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/svg+xml',
  'image/x-icon',
]);

export const SYSTEM_TITLE_PREFIX = '$:/';
export const ETC_TITLE_PREFIX = '/etc/';
export const VARIABLE_PERSONAL_BAG = 'PERSONAL_BAG';

export const ENV_VAR_OVERRIDE_BACKEND_CONFIG = 'BACKEND_CONFIG';
export const ENV_VAR_FIREBASE_CONFIG = 'FIREBASE_CONFIG';
export const DEFAULT_TIMEOUT_SECONDS = 300;