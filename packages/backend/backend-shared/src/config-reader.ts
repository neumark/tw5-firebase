import { BackendConfig, FirebaseConfig} from '@tw5-firebase/shared/src/model/config';
import { assertValid } from '@tw5-firebase/backend-shared/src/validator';
import { ENV_VAR_OVERRIDE_BACKEND_CONFIG, ENV_VAR_FIREBASE_CONFIG } from '@tw5-firebase/shared/src/constants';
import * as functions from 'firebase-functions';
import { configSchema } from '@tw5-firebase/shared/src/schema';

const readEnvVar = (varName:string, allowMissing = false):string|undefined => {
    if (!(varName in process.env)) {
        if (allowMissing) {
            return undefined;
        }
        else {
            throw new Error(`no env var name '${varName}' found`);
        }
    }
    return JSON.parse(process.env[ENV_VAR_OVERRIDE_BACKEND_CONFIG]!);
};
const getBackendConfig:() => BackendConfig = () => {
    let config = readEnvVar(ENV_VAR_OVERRIDE_BACKEND_CONFIG, true);
    if (config === undefined) {
      config = functions.config().tw5firebase.backendconfig;
    }
    if (!config) {
      throw new Error(`backend config not found in either ${ENV_VAR_OVERRIDE_BACKEND_CONFIG} env var or firebase function config.`)
    }
    return assertValid<BackendConfig>(JSON.parse(config), configSchema, 'BackendConfig');
};

export const backendConfig = getBackendConfig();
export const firebaseConfig = assertValid<FirebaseConfig>(JSON.parse(readEnvVar(ENV_VAR_FIREBASE_CONFIG)!), configSchema, 'FirebaseConfig');