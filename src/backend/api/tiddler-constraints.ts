import {
  CONTENT_TIDDLER_TYPES,
  PERSONAL_TAG,
  PERSONAL_TIDDLERS,
  SYSTEM_TITLE_PREFIX,
} from "../../constants";
import { Tiddler } from "../../model/tiddler";

type TiddlerConstraint = (tiddler: Tiddler) => boolean;

const hasField = (tiddler: Tiddler, field: string, value = null) =>
  !!(
    tiddler &&
    tiddler.fields &&
    tiddler.fields.hasOwnProperty(field) &&
    (value != null ? tiddler.fields[field] === value : true)
  );

const hasTag = (tiddler: Tiddler, tag: string) =>
  !!(tiddler && tiddler.tags && tiddler.tags.includes(tag));

const isDraftTiddler = (tiddler: Tiddler) => hasField(tiddler, "draft.of");

const isPlugin = (tiddler: Tiddler) => hasField(tiddler, "plugin-type");

const tiddlerConstraints: { [key: string]: TiddlerConstraint } = {
  isContentTiddler: (tiddler: Tiddler) =>
    CONTENT_TIDDLER_TYPES.has(tiddler.type) && !isPlugin(tiddler),

  isPersonalTiddler: (tiddler: Tiddler) =>
    PERSONAL_TIDDLERS.has(tiddler.title) ||
    isDraftTiddler(tiddler) ||
    hasTag(tiddler, PERSONAL_TAG),

  isSystemTiddler: (tiddler: Tiddler) =>
    tiddler.title.startsWith(SYSTEM_TITLE_PREFIX) ||
    !tiddlerConstraints.isContentTiddler(tiddler),
};

const negateConstraint = (fn: TiddlerConstraint) => (tiddler: Tiddler) =>
  !fn(tiddler);

export const checkConstraint = (
  constraint: string,
  tiddler: Tiddler
): boolean => {
  const trimmed = constraint.trim();
  const negate = trimmed.startsWith("!");
  const name = trimmed.replace("!", "");
  if (!(name in tiddlerConstraints)) {
    throw new Error(`Unknown tiddler constraint: "${name}"`);
  }
  const fn: TiddlerConstraint = negate
    ? negateConstraint(tiddlerConstraints[name])
    : tiddlerConstraints[name];
  return fn(tiddler);
};
