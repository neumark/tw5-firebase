import Ajv, { Schema } from 'ajv';
import _HTTPtiddlerSchema from '../../../generated/jsonschema/tiddler.json';
import _bagPolicySchema from '../../../generated/jsonschema/bag-policy.json';
import _roleAssignmentSchema from '../../../generated/jsonschema/role-assignment.json';

export const getValidator = (schema:Schema) => {
    const ajv = new Ajv({allErrors: true });
    try {
        const validate = ajv.compile(schema);
        return (data:any) => {
            const valid = validate(data);
            return {valid, errors: validate.errors};
        };
    } catch (e) {
        console.error(`schema compilation error: ${e.message} ${e.stack} ${JSON.stringify(schema, null, 4)}`);
        throw e;
    }
};

export const HTTPtiddlerSchema = _HTTPtiddlerSchema as Schema;
export const bagPolicySchema = _bagPolicySchema as Schema;
export const roleAssignmentSchema = _roleAssignmentSchema  as Schema;
