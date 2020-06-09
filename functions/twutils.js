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
}

const pad = (num, length = 2) => num.toString().padStart(length, "0");

const stringifyDate = value => value.getUTCFullYear() +
			pad(value.getUTCMonth() + 1) +
			pad(value.getUTCDate()) +
			pad(value.getUTCHours()) +
			pad(value.getUTCMinutes()) +
			pad(value.getUTCSeconds()) +
			pad(value.getUTCMilliseconds(),3);

// converts firestore dates to string timestamps in tiddler fields
const fixDates = tiddler => Object.assign({}, tiddler, {
      created: stringifyDate(tiddler.created.toDate()),
      modified: stringifyDate(tiddler.modified.toDate())
});

module.exports = {isDate, parseDate, pad, stringifyDate, fixDates};
