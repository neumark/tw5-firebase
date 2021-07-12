import { Schema } from 'ajv';
import _tiddlerDataSchema from '../generated/jsonschema/tiddlerdata.json';
import _configSchema from '../generated/jsonschema/config.json';

export const tiddlerDataSchema = _tiddlerDataSchema as Schema;
export const configSchema = _configSchema as Schema;
