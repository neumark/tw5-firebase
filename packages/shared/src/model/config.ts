import { ResolvedRecipe } from "./recipe";
import { RoleName } from "./roles";

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  databaseURL?: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

/**
 * Defaults for the given tw5-firebase environment
 */
export interface TW5FirebaseEnvironmentConfig {
  defaultEnv: string;
}

/**
 * Served to frontend when wiki loads by ':wiki/config' endpoint
 */
export interface WikiInitState {
  resolvedRecipe: ResolvedRecipe,
  role: RoleName
}

export interface BackendConfig {
  apiRegion: string;
  timeoutSeconds?: number; // max number of seconds to allow cloud function to run
  allowedDomains?: string[] // CORS-enbled origin domains
}

export interface DeploymentConfig {
  cloudFunctions?: string[] // firebase deploy should deploy these functions
  hostingSites?: string[] // firebase deploy should deploy these hosting sites
}

export interface WikiLocation {
  wikiName: string,
  apiEndpoint: string,
}

export type OuterFrameBuildConfig = WikiLocation & FirebaseConfig;

/**
 * Secret keys, in etc/keys*json
 */
export interface Keys {
  firebaseToken: string;
  refreshToken?: string;
}
