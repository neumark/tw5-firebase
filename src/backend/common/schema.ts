import Ajv, { Schema } from 'ajv';
import _tiddlerDataSchema from '../../../generated/jsonschema/tiddlerdata.json';
import _bagPolicySchema from '../../../generated/jsonschema/bag-policy.json';
import _roleAssignmentSchema from '../../../generated/jsonschema/role-assignment.json';
import _recipesSchema from '../../../generated/jsonschema/recipes.json';

export const tiddlerDataSchema = _tiddlerDataSchema as Schema;
export const bagPolicySchema = _bagPolicySchema as Schema;
export const roleAssignmentSchema = _roleAssignmentSchema  as Schema;
export const recipesSchema = _recipesSchema  as Schema;
