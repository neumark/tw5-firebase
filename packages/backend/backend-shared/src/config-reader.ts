import { BackendConfig} from '@tw5-firebase/shared/src/model/config';
import { assertValid } from '@tw5-firebase/shared/src/util/validator';
import { CONFIG_VAR_BACKEND_CONFIG } from '@tw5-firebase/shared/src/constants';
import * as functions from 'firebase-functions';
import { configSchema } from '@tw5-firebase/shared/src/schema';
import { objMap } from '../../../shared/src/util/map';

const jsonDecodeFields = (serialized:Record<string, string>):Record<string, any> => objMap(
  ([k, v]) => [k, JSON.parse(v)],
  serialized)

const readConfigVar = (varName:string, allowMissing = false):Record<string, any> => {
  const value = functions.config().tw5firebase?.[varName];
  if (value===undefined) {
      if (!allowMissing) {
          throw new Error(`no function config var named '${varName}' found`);
      }
  }
  return value ? jsonDecodeFields(value) : value;
};

const readConfigWithFallback = <T>(configVarName: string, definition:string):T => {
  const configValue = readConfigVar(configVarName);
  return assertValid(configValue as T, configSchema, definition);
}

export const backendConfig = readConfigWithFallback<BackendConfig>(CONFIG_VAR_BACKEND_CONFIG, 'BackendConfig');