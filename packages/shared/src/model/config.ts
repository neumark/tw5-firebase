import { ResolvedRecipe } from "./recipe";
import { ROLE } from "./roles";

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
export interface FrontendConfig {
  firebase: FirebaseConfig,
  resolvedRecipe: ResolvedRecipe,
  role: ROLE
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
/**
 * Webpack hard-codes this into the outer-frame JS.
 * Note: can '&' this with other interfaces if required later.
 */
export type OuterFrameBuildConfig = WikiLocation;

/**
 * Secret keys, in etc/keys*json
 */
export interface Keys {
  firebaseToken: string;
  refreshToken?: string;
}
