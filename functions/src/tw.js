const {PERSONAL_TIDDLERS, PERSONAL_TAG, GLOBAL_CONTENT_BAG, GLOBAL_SYSTEM_BAG, TIDDLER_TYPE, SYSTEM_TITLE_PREFIX} = require('./constants');

const isDate = value => Object.prototype.toString.call(value) === "[object Date]";

const parseDate = value => {
	if(typeof value === "string") {
		return new Date(Date.UTC(parseInt(value.substr(0,4),10),
				parseInt(value.substr(4,2),10)-1,
				parseInt(value.substr(6,2),10),
				parseInt(value.substr(8,2)||"00",10),
				parseInt(value.substr(10,2)||"00",10),
				parseInt(value.substr(12,2)||"00",10),
				parseInt(value.substr(14,3)||"000",10)));
	} else if($tw.utils.isDate(value)) {
		return value;
	} else {
		return null;
	}
};

const pad = (num, length = 2) => num.toString().padStart(length, "0");

const stringifyDate = value => value.getUTCFullYear() +
			pad(value.getUTCMonth() + 1) +
			pad(value.getUTCDate()) +
			pad(value.getUTCHours()) +
			pad(value.getUTCMinutes()) +
			pad(value.getUTCSeconds()) +
			pad(value.getUTCMilliseconds(),3);

const getRevision = (user, timestamp) => `${stringifyDate(timestamp)}:${user.uid}`

const hasField = (tiddler, field, value=null) => tiddler && tiddler.fields && tiddler.fields.hasOwnProperty(field) && (value != null ? tiddler.fields[tag] === value : true);

const hasTag = (tiddler, tag) => tiddler && tiddler.tags && tiddler.tags.includes(tag);

const isDraftTiddler = tiddler => hasField(tiddler, 'draft.of');

const isPersonalTiddler = tiddler => PERSONAL_TIDDLERS.includes(tiddler.title) || isDraftTiddler(tiddler) || hasTag(tiddler, PERSONAL_TAG);

const isSystemTiddler = tiddler => tiddler.title.startsWith(SYSTEM_TITLE_PREFIX) || (tiddler.type && tiddler.type !== TIDDLER_TYPE);

const CONSTRAINTS = {isDraftTiddler, isPersonalTiddler, isSystemTiddler};

const getConstraintChecker = constraint => {
    const trimmed = constraint.trim();
    const negate = trimmed.startsWith("!");
    const name = trimmed.replace("!", "");
    if (!CONSTRAINTS.hasOwnProperty(name)) {
        throw new Error(`Unknown tiddler constraint: "${name}"`);
    }
    const fn = CONSTRAINTS[name];
    return negate ? (...args) => !fn(...args) : fn;
};

module.exports = {isDate, parseDate, pad, stringifyDate, getRevision, isDraftTiddler, isPersonalTiddler, isSystemTiddler, getConstraintChecker};
