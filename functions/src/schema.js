const Ajv = require('ajv');

const string = {"type": "string"};

const nonEmptyString = Object.assign({minLength: 1}, string);

const user = Object.assign({format: "email"}, string);

const timestamp = Object.assign({pattern: "^[0-9]{17}$"}, string);

const tiddlerSchema = {
    type: "object",
    properties: {
	    "bag": nonEmptyString,
        "created": nonEmptyString,
        "creator": nonEmptyString,
        "modified": timestamp,
        "modifier": user,
        "revision": nonEmptyString, // TODO: exact format of revision,
        "tags": {type: "array", items: nonEmptyString},
        "text": string,
        "title": nonEmptyString,
        "type": string,
        "uri": string,
        "fields": {type: "object", additionalProperties: string}
    },
    additionalProperties: false,
    required: ["title"]
};

const getValidator = (schema) => {
    const ajv = new Ajv({allErrors: true });
    try {
        const validate = ajv.compile(schema);
        return data => {
            const valid = validate(data);
            return {valid, errors: validate.errors};
        };
    } catch (e) {
        console.error(`schema compilation error: ${e.message} ${e.stack} ${JSON.stringify(schema, null, 4)}`);
        throw e;
    }
};

const validateTiddler = getValidator(tiddlerSchema);

module.exports = {validateTiddler};
