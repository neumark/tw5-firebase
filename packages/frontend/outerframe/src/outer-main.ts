import 'reflect-metadata';
import firebase from 'firebase';
import * as firebaseui from 'firebaseui';
import { FrontendConfig, OuterFrameBuildConfig, WikiLocation } from '@tw5-firebase/shared/src/model/config';
import { deleteAccount, handleConfigChange, handleSignedInUser, handleSignedOutUser, signInWithPopup } from './login';
declare let __BUILD_CONFIG__: string;

let ui: firebaseui.auth.AuthUI;

/**
 * @param {string} queryString The full query string.
 * @return {!Object<string, string>} The parsed query parameters.
 */
const parseQueryString = (queryString: string) => {
  // Remove first character if it is ? or #.
  const config: Record<string, string> = {};
  if (!queryString) {
    return config;
  }
  if (queryString.charAt(0) === '#' || queryString.charAt(0) === '?') {
    queryString = queryString.substring(1);
  }

  const pairs = queryString.split('&');
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i].split('=');
    if (pair.length == 2) {
      config[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
    }
  }
  return config;
}

const RE_WIKI_NAME = /^\/w\/([A-Za-z0-9-_]+)\/?$/;

const getMergedBuildConfig = ():OuterFrameBuildConfig => {
// start with hardcoded configuration
const buildConfigJSON:string = __BUILD_CONFIG__;
const config = JSON.parse(buildConfigJSON) as OuterFrameBuildConfig;
  // extend with hash parameters
  const urlHashConfig = parseQueryString(location.search) as Partial<OuterFrameBuildConfig>;
  Object.assign(config, urlHashConfig);
  // override wiki name based on path part of url if set
  const wikiNameInPath = window.location.pathname.match(RE_WIKI_NAME);
  if (wikiNameInPath) {
    config.wikiName = wikiNameInPath[1];
  }
  return config;
}

const getFrontendConfig = async (wikiLocation: WikiLocation):Promise<FrontendConfig> => {
  // fetch frontend config from backend
  return await (await fetch(`${wikiLocation.apiEndpoint}${wikiLocation.wikiName}/frontendconfig`)).json();
}

const initFirebase = async () => {

  const wikiLocation = getMergedBuildConfig();
  const frontendConfig = await getFrontendConfig(wikiLocation);
  // init firebase:
  firebase.initializeApp(frontendConfig.firebase);
  return {frontendConfig, wikiLocation};
};

/**
 * Initializes the app.
 */
const initApp = async () => {
  const {frontendConfig, wikiLocation} = await initFirebase()

  const startTW5 = (user: firebase.User ) => {
    console.log("this is where TW5 would start...", frontendConfig, user, wikiLocation);
  };
  // Listen to change in auth state so it displays the correct UI for when
  // the user is signed in or not.
  firebase.auth().onAuthStateChanged(function (user: firebase.User | null) {
    (document.getElementById('loading') as any).style.display = 'none';
    (document.getElementById('loaded') as any).style.display = 'block';
    user ? handleSignedInUser(startTW5, user!) : handleSignedOutUser(startTW5);
  });
  // Initialize the FirebaseUI Widget using Firebase.
  ui = new firebaseui.auth.AuthUI(firebase.auth());
  // Disable auto-sign in.
  ui.disableAutoSignIn();
  // document.getElementById('sign-in-with-redirect').addEventListener( 'click', signInWithRedirect);
  document.getElementById('sign-in-with-popup')?.addEventListener('click', signInWithPopup);
  document.getElementById('sign-out')?.addEventListener('click', () => firebase.auth().signOut());
  document.getElementById('delete-account')?.addEventListener('click', () => deleteAccount());
  document.getElementById('recaptcha-normal')?.addEventListener('change', () => handleConfigChange(startTW5));
  document.getElementById('recaptcha-invisible')?.addEventListener('change', () => handleConfigChange(startTW5));
  // Check the selected reCAPTCHA mode.
  //(document.querySelector('input[name="recaptcha"][value="' + getRecaptchaMode() + '"]') as any).checked = true;
  document.getElementById('email-signInMethod-password')?.addEventListener('change', () => handleConfigChange(startTW5));
  document.getElementById('email-signInMethod-emailLink')?.addEventListener('change', () => handleConfigChange(startTW5));
  // Check the selected email signInMethod mode.
  //(document.querySelector('input[name="emailSignInMethod"][value="' + getEmailSignInMethod() + '"]') as any).checked = true;
};

window.addEventListener('load', initApp);
