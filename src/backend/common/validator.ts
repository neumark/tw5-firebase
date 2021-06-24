import Ajv, { Schema } from 'ajv';

export const getValidator = (schema: Schema) => {
    const ajv = new Ajv({ allErrors: true });
    try {
        const validate = ajv.compile(schema);
        return (data: any) => {
            const valid = validate(data);
            return { valid, errors: validate.errors };
        };
    } catch (e) {
        console.error(`schema compilation error: ${e.message} ${e.stack} ${JSON.stringify(schema, null, 4)}`);
        throw e;
    }
};
