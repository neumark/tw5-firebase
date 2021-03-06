const Ajv = require('ajv').default;

const string = {"type": "string"};

const nonEmptyString = {minLength: 1, ...string};
const user = nonEmptyString;

const timestamp = {pattern: "^[0-9]{17}$", ...string};

// NOTE: order matters, role.js uses this array to assign role numbers to each role. DO NOT EXTEND ARRAY!
const roleNames = ['anonymous', 'authenticated', 'reader', 'editor', 'admin'];

const role = {"enum": roleNames, ...string};

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

/* Bag policy example:
 * {
 *  "write": [{"email": "j@j.com"}, {"role": "admin"}],
 *  "read": [{"role": "anonymous"}],
 *  "constraints": ["systemTiddler", "!isDraft"]
 * }
 */

const grantee = {
    anyOf: [
        {
            type: 'object',
            properties: {userId: nonEmptyString},
            additionalProperties: false,
            required: ["userId"]
        },
        {
            type: 'object',
            properties: {email: nonEmptyString},
            additionalProperties: false,
            required: ["email"]
        },
        {
            type: 'object',
            properties: {role},
            additionalProperties: false,
            required: ["role"]
        },
    ]
}

const bagPolicySchema = {
    type: "object",
    properties: {
        write: {type: 'array', items: grantee},
        read: {type: 'array', items: grantee},
        constraints: {type: 'array', items: nonEmptyString}
    },
    additionalProperties: false,
    required: ["write", "read"]
}

const recipeSchema = {type: 'array', items: nonEmptyString};

const validateTiddler = getValidator(tiddlerSchema);

module.exports = {validateTiddler, getValidator, tiddlerSchema, bagPolicySchema, recipeSchema, roleNames};
