import {
  CONTENT_TIDDLER_TYPES,
  PERSONAL_TAG,
  PERSONAL_TIDDLERS,
  SYSTEM_TITLE_PREFIX,
} from "../../constants";
import { PartialTiddlerData } from "../../shared/model/tiddler";

type TiddlerDataConstraint = (title: string, tiddlerData: PartialTiddlerData) => boolean;

const hasField = (tiddlerData: PartialTiddlerData, field: string, value = null) =>
    tiddlerData.fields !== undefined &&
    tiddlerData.fields.hasOwnProperty(field) &&
    (value != null ? tiddlerData.fields[field] === value : true);

const hasTag = (tiddlerData: PartialTiddlerData, tag: string) => tiddlerData.tags !== undefined && tiddlerData.tags.includes(tag);

const isDraftTiddler = (tiddlerData: PartialTiddlerData) => hasField(tiddlerData, "draft.of");

const isPlugin = (tiddlerData: PartialTiddlerData) => hasField(tiddlerData, "plugin-type");

const tiddlerConstraints: { [key: string]: TiddlerDataConstraint } = {
  isContentTiddler: (title: string, tiddlerData: PartialTiddlerData) => tiddlerData.type !== undefined && CONTENT_TIDDLER_TYPES.has(tiddlerData.type) && !isPlugin(tiddlerData),

  isPersonalTiddler: (title: string, tiddlerData: PartialTiddlerData) =>
    PERSONAL_TIDDLERS.has(title) ||
    isDraftTiddler(tiddlerData) ||
    hasTag(tiddlerData, PERSONAL_TAG),

  isSystemTiddler: (title: string, tiddlerData: PartialTiddlerData) =>
    title.startsWith(SYSTEM_TITLE_PREFIX) ||
    !tiddlerConstraints.isContentTiddler(title, tiddlerData),
};

const negateConstraint = (fn: TiddlerDataConstraint) => (title:string, tiddlerData: PartialTiddlerData) =>
  !fn(title, tiddlerData);

export const checkConstraint = (
  constraint: string,
  title: string,
  tiddlerData: PartialTiddlerData
): boolean => {
  const trimmed = constraint.trim();
  const negate = trimmed.startsWith("!");
  const name = trimmed.replace("!", "");
  if (!(name in tiddlerConstraints)) {
    throw new Error(`Unknown tiddler constraint: "${name}"`);
  }
  const fn: TiddlerDataConstraint = negate
    ? negateConstraint(tiddlerConstraints[name])
    : tiddlerConstraints[name];
  return fn(title, tiddlerData);
};
