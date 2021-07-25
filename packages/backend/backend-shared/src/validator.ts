import Ajv, { Schema } from 'ajv';

export const getValidator = (schema: Schema, definition?:string) => {
  console.log(`getValidator(${schema}, ${definition})`)
  const ajv = new Ajv({ allErrors: true });
  try {
    if (definition) {
      ajv.addSchema(schema);
    }
    const validate = definition ? ajv.getSchema(`#/definitions/${definition}`) : ajv.compile(schema);
    if (!validate) {
      throw new Error("Could not get validator for schema and definition!")
    }
    return (data: any) => {
      const valid = validate(data);
      return { valid, errors: validate.errors };
    };
  } catch (e) {
    console.error(`schema compilation error: ${e.message} ${e.stack} ${JSON.stringify(schema, null, 4)}`);
    throw e;
  }
};

export const assertValid = <T>(data:T, ...args:Parameters<typeof getValidator>) => {
  const validation = getValidator(...args)(data);
  if (!validation.valid) {
      throw new Error(`data could not be validated against schema '${args.join(':')}'\n: ${JSON.stringify(validation.errors, null, 4)}\n${JSON.stringify(data, null, 4)}`);
  }
  return data;
};