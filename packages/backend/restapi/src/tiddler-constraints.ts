import {
  BUILTIN_BAG_CONTENT,
  BUILTIN_BAG_ETC,
  BUILTIN_BAG_SYSTEM,
  CONTENT_TIDDLER_TYPES,
  ETC_TITLE_PREFIX,
  JSON_TIDDLER_TYPE,
  PERSONAL_TAG,
  PERSONAL_TIDDLERS,
  SYSTEM_TITLE_PREFIX,
} from '@tw5-firebase/shared/src/constants';
import { PartialTiddlerData } from '@tw5-firebase/shared/src/model/tiddler';

type TiddlerDataConstraint = (title: string, tiddlerData: PartialTiddlerData) => boolean;

const hasField = (tiddlerData: PartialTiddlerData, field: string, value = null) =>
  tiddlerData.fields !== undefined &&
  tiddlerData.fields.hasOwnProperty(field) &&
  (value != null ? tiddlerData.fields[field] === value : true);

const hasTag = (tiddlerData: PartialTiddlerData, tag: string) =>
  tiddlerData.tags !== undefined && tiddlerData.tags.includes(tag);

const isDraftTiddler = (tiddlerData: PartialTiddlerData) => hasField(tiddlerData, 'draft.of');

const isPlugin = (tiddlerData: PartialTiddlerData) => hasField(tiddlerData, 'plugin-type');

export const KNOWN_BAG_CONSTRAINTS: Record<string, TiddlerDataConstraint> = {
  [BUILTIN_BAG_ETC]: (title: string, tiddlerData: PartialTiddlerData) =>
    tiddlerData.type === JSON_TIDDLER_TYPE && title.startsWith(ETC_TITLE_PREFIX),
  [BUILTIN_BAG_CONTENT]: (title: string, tiddlerData: PartialTiddlerData) =>
    (tiddlerData.type === undefined || CONTENT_TIDDLER_TYPES.has(tiddlerData.type)) && !isPlugin(tiddlerData),
  [BUILTIN_BAG_SYSTEM]: (title: string, tiddlerData: PartialTiddlerData) =>
    tiddlerData.type !== undefined && title.startsWith(SYSTEM_TITLE_PREFIX),
};

export const PERSONAL_BAG_CONSTRAINT: TiddlerDataConstraint = (title: string, tiddlerData: PartialTiddlerData) =>
  PERSONAL_TIDDLERS.has(title) || isDraftTiddler(tiddlerData) || hasTag(tiddlerData, PERSONAL_TAG);
