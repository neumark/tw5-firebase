import { Tiddler } from '../../model/tiddler';
import {PERSONAL_TIDDLERS, PERSONAL_TAG, GLOBAL_CONTENT_BAG, GLOBAL_SYSTEM_BAG, CONTENT_TIDDLER_TYPES, SYSTEM_TITLE_PREFIX} from './constants';
import { User } from './user';

export function isDate(value:any):value is Date {
  return Object.prototype.toString.call(value) === "[object Date]";
}

export const parseDate = (value:string|Date|undefined):Date|null => {
	if(typeof value === "string") {
		return new Date(Date.UTC(parseInt(value.substr(0,4),10),
				parseInt(value.substr(4,2),10)-1,
				parseInt(value.substr(6,2),10),
				parseInt(value.substr(8,2)||"00",10),
				parseInt(value.substr(10,2)||"00",10),
				parseInt(value.substr(12,2)||"00",10),
				parseInt(value.substr(14,3)||"000",10)));
	} else if(isDate(value)) {
		return value;
	} else {
		return null;
	}
};

const pad = (num:number, length = 2) => num.toString().padStart(length, "0");

export const stringifyDate = (value:Date) => value.getUTCFullYear() +
			pad(value.getUTCMonth() + 1) +
			pad(value.getUTCDate()) +
			pad(value.getUTCHours()) +
			pad(value.getUTCMinutes()) +
			pad(value.getUTCSeconds()) +
			pad(value.getUTCMilliseconds(),3);

export const getRevision = (user:User, timestamp:Date) => `${stringifyDate(timestamp)}:${user.uid}`;

const hasField = (tiddler:Tiddler, field:string, value=null) => !!(tiddler && tiddler.fields && tiddler.fields.hasOwnProperty(field) && (value != null ? tiddler.fields[field] === value : true));

const hasTag = (tiddler:Tiddler, tag:string) => !!(tiddler && tiddler.tags && tiddler.tags.includes(tag));

const isDraftTiddler = (tiddler:Tiddler) => hasField(tiddler, 'draft.of');

const isPlugin = (tiddler:Tiddler) => hasField(tiddler, 'plugin-type');

const isContentTiddler = (tiddler:Tiddler) => CONTENT_TIDDLER_TYPES.has(tiddler.type) && !isPlugin(tiddler);

const isPersonalTiddler = (tiddler:Tiddler) => PERSONAL_TIDDLERS.has(tiddler.title) || isDraftTiddler(tiddler) || hasTag(tiddler, PERSONAL_TAG);

const isSystemTiddler = (tiddler:Tiddler) => tiddler.title.startsWith(SYSTEM_TITLE_PREFIX) || !isContentTiddler(tiddler);

export type ConstraintFn = (tiddler:Tiddler)=>boolean;

const negateConstraint = (fn:ConstraintFn) => (tiddler:Tiddler) => !fn(tiddler);

const CONSTRAINTS:{[key:string]:ConstraintFn} = {isDraftTiddler, isPersonalTiddler, isSystemTiddler};

export const getConstraintChecker = (constraint:string):ConstraintFn => {
    const trimmed = constraint.trim();
    const negate = trimmed.startsWith("!");
    const name = trimmed.replace("!", "");
    if (!CONSTRAINTS.hasOwnProperty(name)) {
        throw new Error(`Unknown tiddler constraint: "${name}"`);
    }
    const fn:ConstraintFn = CONSTRAINTS[name];
    return negate ? negateConstraint(fn) : fn;
};
