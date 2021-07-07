import 'reflect-metadata';
import firebase from 'firebase';
import * as firebaseui from 'firebaseui';
import 'firebaseui/dist/firebaseui.css';
import { TW5TiddlerFields } from '../../tw5-shared/src/tw5-types';
import { FetchHTTPTransport } from '../../frontend-shared/src/fetch-http-transport';
import { HTTPStoreClient } from '../../../shared/src/apiclient/http-store-client';
import { mapOrApply } from '../../../shared/src/util/map';
import { FirebaseConfig, WikiLocation } from '../../../shared/src/model/config';
import { DEFAULT_RECIPE_NAME } from '../../constants';
import { startTW5 } from './tw5-starter';

declare let __DEFAULT_WIKI_LOCATION__: string;

let ui: firebaseui.auth.AuthUI;

function getUiConfig(wikiLocation: WikiLocation) {
  return {
    callbacks: {
      // Called when the user has been successfully signed in.
      // Note: types in node_modules/firebaseui/dist/index.d.ts
      signInSuccessWithAuthResult: function (authResult: any, redirectUrl: string) {
        if (authResult.user) {
          handleSignedInUser(wikiLocation, authResult.user);
        }
        if (authResult.additionalUserInfo) {
          (document.getElementById('is-new-user') as any).textContent = authResult.additionalUserInfo.isNewUser
            ? 'New User'
            : 'Existing User';
        }
        // Do not redirect.
        return false;
      },
      signInFailure: (error: firebaseui.auth.AuthUIError): Promise<void> | void => {
        // TODO: provide proper error msg on login error
        console.log('auth error', error);
      },
    },
    // Opens IDP Providers sign-in flow in a popup.
    // TODO: change this to 'redirect'
    signInFlow: 'popup',
    signInOptions: [
      {
        provider: firebase.auth.GoogleAuthProvider.PROVIDER_ID,
        // get this from GCP Credentials page
        // TODO: make this come from config.json
        clientId: '1019270346260-fh2s7fjmige0qlu6nonmm514rvrafbd9.apps.googleusercontent.com',
      },
      /*
      {
        provider: firebase.auth.FacebookAuthProvider.PROVIDER_ID,
        scopes :[
          'public_profile',
          'email',
          'user_likes',
          'user_friends'
        ]
      },
      */
      //firebase.auth.TwitterAuthProvider.PROVIDER_ID,
      firebase.auth.GithubAuthProvider.PROVIDER_ID,
      {
        provider: firebase.auth.EmailAuthProvider.PROVIDER_ID,
        // Whether the display name should be displayed in Sign Up page.
        requireDisplayName: true,
        signInMethod: getEmailSignInMethod(),
      },
      {
        provider: firebase.auth.PhoneAuthProvider.PROVIDER_ID,
        recaptchaParameters: {
          size: getRecaptchaMode(),
        },
      },
      /*{
        provider: 'microsoft.com',
        loginHintKey: 'login_hint'
      },
      {
        provider: 'apple.com',
      },
      firebaseui.auth.AnonymousAuthProvider.PROVIDER_ID*/
    ],
    // TODO: Terms of service url.
    tosUrl: '/tos.html',
    // TODO: Privacy policy url.
    privacyPolicyUrl: '/privacy.html',
    credentialHelper: firebaseui.auth.CredentialHelper.GOOGLE_YOLO,
  };
}

/**
 * @return {string} The URL of the FirebaseUI standalone widget.
 */
function getWidgetUrl() {
  return '/widget#recaptcha=' + getRecaptchaMode() + '&emailSignInMethod=' + getEmailSignInMethod();
}

/**
 * Open a popup with the FirebaseUI widget.
 */
const signInWithPopup = function () {
  window.open(getWidgetUrl(), 'Sign In', 'width=985,height=735');
};


/**
 * Displays the UI for a signed in user.
 * @param {!firebase.User} user
 */
const handleSignedInUser = async function (wikiLocation: WikiLocation, user: firebase.User) {
  /*
  (document.getElementById('user-signed-in') as any).style.display = 'block';
  (document.getElementById('user-signed-out') as any).style.display = 'none';
  (document.getElementById('name') as any).textContent = user.displayName;
  (document.getElementById('email') as any).textContent = user.email;
  (document.getElementById('phone') as any).textContent = user.phoneNumber;
  let photoURL;
  if (user.photoURL) {
    photoURL = user.photoURL;
    // Append size to the photo URL for Google hosted images to avoid requesting
    // the image with its original resolution (using more bandwidth than needed)
    // when it is going to be presented in smaller size.
    if (photoURL.indexOf('googleusercontent.com') != -1 || photoURL.indexOf('ggpht.com') != -1) {
      photoURL = photoURL + '?sz=' + document.getElementById('photo')?.clientHeight;
    }
    (document.getElementById('photo') as any).src = photoURL;
    (document.getElementById('photo') as any).style.display = 'block';
  } else {
    (document.getElementById('photo') as any).style.display = 'none';
  }
  */
  // --- start tiddlywiki ---
  startTW5(wikiLocation, user);
};

/**
 * Displays the UI for a signed out user.
 */
const handleSignedOutUser = function (wikiLocation: WikiLocation) {
  (document.getElementById('user-signed-in') as any).style.display = 'none';
  (document.getElementById('user-signed-out') as any).style.display = 'block';
  ui.start('#firebaseui-container', getUiConfig(wikiLocation));
};

/**
 * Deletes the user's account.
 */
const deleteAccount = function () {
  firebase
    .auth()
    .currentUser?.delete()
    .catch(function (error) {
      if (error.code == 'auth/requires-recent-login') {
        // The user's credential is too old. She needs to sign in again.
        firebase
          .auth()
          .signOut()
          .then(function () {
            // The timeout allows the message to be displayed after the UI has
            // changed to the signed out state.
            setTimeout(function () {
              alert('Please sign in again to delete your account.');
            }, 1);
          });
      }
    });
};

/**
 * Handles when the user changes the reCAPTCHA or email signInMethod config.
 */
function handleConfigChange(wikiLocation:WikiLocation) {
  const newRecaptchaValue = (document.querySelector('input[name="recaptcha"]:checked') as any).value;
  const newEmailSignInMethodValue = (document.querySelector('input[name="emailSignInMethod"]:checked') as any).value;
  location.replace(
    location.pathname + '#recaptcha=' + newRecaptchaValue + '&emailSignInMethod=' + newEmailSignInMethodValue,
  );

  // Reset the inline widget so the config changes are reflected.
  ui.reset();
  ui.start('#firebaseui-container', getUiConfig(wikiLocation));
}

function getRecaptchaMode() {
  const config = parseQueryString(location.hash);
  return config['recaptcha'] === 'invisible' ? 'invisible' : 'normal';
}

/**
 * @return {string} The email signInMethod from the configuration.
 */
function getEmailSignInMethod() {
  const config = parseQueryString(location.hash);
  return config['emailSignInMethod'] === 'password' ? 'password' : 'emailLink';
}

/**
 * @param {string} queryString The full query string.
 * @return {!Object<string, string>} The parsed query parameters.
 */
function parseQueryString(queryString: string) {
  // Remove first character if it is ? or #.
  if (queryString.length > 0 && (queryString.charAt(0) == '#' || queryString.charAt(0) == '?')) {
    queryString = queryString.substring(1);
  }
  const config: Record<string, string> = {};
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

  // Listen to change in auth state so it displays the correct UI for when
  // the user is signed in or not.
  firebase.auth().onAuthStateChanged(function (user: firebase.User | null) {
    (document.getElementById('loading') as any).style.display = 'none';
    (document.getElementById('loaded') as any).style.display = 'block';
    user ? handleSignedInUser(wikiLocation, user!) : handleSignedOutUser(wikiLocation);
  });
  // Initialize the FirebaseUI Widget using Firebase.
  ui = new firebaseui.auth.AuthUI(firebase.auth());
  // Disable auto-sign in.
  ui.disableAutoSignIn();
  // document.getElementById('sign-in-with-redirect').addEventListener( 'click', signInWithRedirect);
  document.getElementById('sign-in-with-popup')?.addEventListener('click', signInWithPopup);
  document.getElementById('sign-out')?.addEventListener('click', () => firebase.auth().signOut());
  document.getElementById('delete-account')?.addEventListener('click', () => deleteAccount());
  document.getElementById('recaptcha-normal')?.addEventListener('change', () => handleConfigChange(wikiLocation));
  document.getElementById('recaptcha-invisible')?.addEventListener('change', () => handleConfigChange(wikiLocation));
  // Check the selected reCAPTCHA mode.
  (document.querySelector('input[name="recaptcha"][value="' + getRecaptchaMode() + '"]') as any).checked = true;
  document.getElementById('email-signInMethod-password')?.addEventListener('change', () => handleConfigChange(wikiLocation));
  document.getElementById('email-signInMethod-emailLink')?.addEventListener('change', () => handleConfigChange(wikiLocation));
  // Check the selected email signInMethod mode.
  (document.querySelector('input[name="emailSignInMethod"][value="' + getEmailSignInMethod() + '"]') as any).checked =
    true;
};

window.addEventListener('load', initApp);
