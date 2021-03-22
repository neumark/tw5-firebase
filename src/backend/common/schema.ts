import Ajv, { Schema } from 'ajv';
import _HTTPTiddlerSchema from '../../../generated/jsonschema/tiddler.json';
import _bagPolicySchema from '../../../generated/jsonschema/bag-policy.json';
import _roleAssignmentSchema from '../../../generated/jsonschema/role-assignment.json';
import _recipesSchema from '../../../generated/jsonschema/recipes.json';

export const HTTPTiddlerSchema = _HTTPTiddlerSchema as Schema;
export const bagPolicySchema = _bagPolicySchema as Schema;
export const roleAssignmentSchema = _roleAssignmentSchema  as Schema;
export const recipesSchema = _recipesSchema  as Schema;
