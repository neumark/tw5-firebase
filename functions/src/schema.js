const Ajv = require('ajv');

const string = {"type": "string"};

const nonEmptyString = Object.assign({minLength: 1}, string);

const user = Object.assign({format: "email"}, string);

const timestamp = Object.assign({pattern: "^[0-9]{17}$"}, string);

// NOTE: order matters, role.js uses this array to assign role numbers to each role.
const roleNames = ['anonymous', 'authenticated', 'reader', 'editor', 'admin'];

const role = {type: "string", "enum": roleNames};

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

/* Roles tiddler example:
 * {
     "admin": ["neumark.peter@gmail.com"],
     "editor": ["peter@jetfabric.com"],
     "reader": ["peter.neumark.jetfabric@gmail.com"]
   }
 *
 */

const rolesSchema = {
    type: "object",
    additionalProperties: {
        type: "array",
        items: user
    },
};

/* Bag policy example:
 * {
 *  "write": [{"user": "j@j.com"}, {"role": "admin"}],
 *  "read": [{"role": "anonymous"}],
 *  "constraints": ["systemTiddler", "!isDraft"]
 * }
 */

const grantee = {
    anyOf: [
        {
            type: 'object',
            properties: {user},
            additionalProperties: false,
            required: ["user"]
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

const validateTiddler = getValidator(tiddlerSchema);

module.exports = {validateTiddler, getValidator, tiddlerSchema, rolesSchema, bagPolicySchema, roleNames};
