const PERSONAL_TIDDLERS = ['$:/StoryList', '$:/HistoryList', '$:/DefaultTiddlers'];
const PERSONAL_TAG = "personal";
const GLOBAL_CONTENT_BAG = "content";
const GLOBAL_SYSTEM_BAG = "system";
const TIDDLER_TYPE = "text/vnd.tiddlywiki";
const SYSTEM_TITLE_PREFIX = "$:/";

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

const getRevision = (email, timestamp) => `${stringifyDate(timestamp)}:${email}`

const isDraftTiddler = tiddler => tiddler.fields && tiddler.fields['draft.of'];

const isPersonalTiddler = tiddler => PERSONAL_TIDDLERS.includes(tiddler.title) || (tiddler.tags && tiddler.tags.includes(PERSONAL_TAG));

const isSystemTiddler = tiddler => tiddler.title.startsWith(SYSTEM_TITLE_PREFIX) || (tiddler.type && tiddler.type !== TIDDLER_TYPE);

const personalBag = email => `user:${email}`;

const applicableBags = email => ([personalBag(email), GLOBAL_SYSTEM_BAG, GLOBAL_CONTENT_BAG]);

const getBagForTiddler = (email, tiddler) => {
    if (isDraftTiddler(tiddler) || isPersonalTiddler(tiddler)) {
        return personalBag(email);
    }
    if (isSystemTiddler(tiddler)) {
        return GLOBAL_SYSTEM_BAG;
    }
    return GLOBAL_CONTENT_BAG;
}

module.exports = {isDate, parseDate, pad, stringifyDate, getRevision, isDraftTiddler, isPersonalTiddler, isSystemTiddler, personalBag, applicableBags, getBagForTiddler, GLOBAL_SYSTEM_BAG, GLOBAL_CONTENT_BAG};
