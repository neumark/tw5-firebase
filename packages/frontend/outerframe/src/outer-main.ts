import 'reflect-metadata';
import firebase from 'firebase';
import * as firebaseui from 'firebaseui';
import 'firebaseui/dist/firebaseui.css';
import { FirebaseConfig, WikiLocation } from '../../shared/src/model/config';
import { deleteAccount, handleConfigChange, handleSignedInUser, handleSignedOutUser, signInWithPopup } from './login';
declare let __DEFAULT_WIKI_LOCATION__: string;

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

const initFirebase = async () => {
  // start with hardcoded default api endpoint url
  const defaultWikiLocation = JSON.parse(__DEFAULT_WIKI_LOCATION__) as WikiLocation;
  // extend with hash parameters
  const urlHashConfig = parseQueryString(location.search) as Partial<WikiLocation>;
  const wikiLocation = Object.assign({}, defaultWikiLocation, urlHashConfig);
  // override wiki name based on path part of url if set
  const wikiNameInPath = window.location.pathname.match(RE_WIKI_NAME);
  if (wikiNameInPath) {
    wikiLocation.wikiName = wikiNameInPath[1];
  }
  // fetch firebase config from backend
  const firebaseConfig = await (await fetch(wikiLocation.apiEndpoint+'firebase-config')).json() as FirebaseConfig;
  // init firebase:
  firebase.initializeApp(firebaseConfig);
  return wikiLocation;
};

/**
 * Initializes the app.
 */
const initApp = async () => {
  const wikiLocation: WikiLocation = await initFirebase()

  const startTW5 = (user: firebase.User ) => {
    console.log("this is where TW5 would start...", user, wikiLocation);
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
