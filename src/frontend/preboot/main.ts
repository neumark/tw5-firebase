import firebase from "firebase";
import * as firebaseui from 'firebaseui'
import 'firebaseui/dist/firebaseui.css'
import { config } from "../../shared/util/config";
import { Config } from "../../shared/model/config";
import { TW5TiddlerFields } from '../tw5/tw5-types';
import {FetchHTTPTransport} from '../shared/fetch-http-transport';
import {HTTPStoreClient} from '../../shared/apiclient/http-store-client';
import { mapOrApply } from "../../shared/util/map";

let ui:firebaseui.auth.AuthUI;

function getUiConfig() {
  return {
    'callbacks': {
      // Called when the user has been successfully signed in.
      // Note: types in node_modules/firebaseui/dist/index.d.ts
      signInSuccessWithAuthResult: function(authResult:any, redirectUrl:string) {
        if (authResult.user) {
          handleSignedInUser(authResult.user);
        }
        if (authResult.additionalUserInfo) {
          (document.getElementById('is-new-user') as any).textContent =
              authResult.additionalUserInfo.isNewUser ?
              'New User' : 'Existing User';
        }
        // Do not redirect.
        return false;
      },
      signInFailure: (error: firebaseui.auth.AuthUIError): Promise<void>|void => {
        // TODO: provide proper error msg on login error
        console.log("auth error", error)
      }
    },
    // Opens IDP Providers sign-in flow in a popup.
    // TODO: change this to 'redirect'
    'signInFlow': 'popup',
    'signInOptions': [
      {
        provider: firebase.auth.GoogleAuthProvider.PROVIDER_ID,
        // get this from GCP Credentials page
        // TODO: make this come from config.json
        clientId: '1019270346260-fh2s7fjmige0qlu6nonmm514rvrafbd9.apps.googleusercontent.com'
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
        signInMethod: getEmailSignInMethod()
      },
      {
        provider: firebase.auth.PhoneAuthProvider.PROVIDER_ID,
        recaptchaParameters: {
          size: getRecaptchaMode()
        }
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
    'tosUrl': '/tos.html',
    // TODO: Privacy policy url.
    'privacyPolicyUrl': '/privacy.html',
    'credentialHelper':  firebaseui.auth.CredentialHelper.GOOGLE_YOLO
  };
}


/**
 * @return {string} The URL of the FirebaseUI standalone widget.
 */
function getWidgetUrl() {
  return '/widget#recaptcha=' + getRecaptchaMode() + '&emailSignInMethod=' +
      getEmailSignInMethod();
}


/**
 * Redirects to the FirebaseUI widget.
 */
var signInWithRedirect = function() {
  window.location.assign(getWidgetUrl());
};


/**
 * Open a popup with the FirebaseUI widget.
 */
var signInWithPopup = function() {
  window.open(getWidgetUrl(), 'Sign In', 'width=985,height=735');
};

const getAuthTokenData = async (user:firebase.User) => {
    const idTokenResult = await /*firebase.auth().currentUser*/user.getIdTokenResult(true);
    return idTokenResult;
};


/**
 * Displays the UI for a signed in user.
 * @param {!firebase.User} user
 */
var handleSignedInUser = async function(user:firebase.User) {

  const getQueryVariables = ():Partial<Config['wiki']> => {
    var query = window.location.search.substring(1);
    var vars = query.split('&');
    const parsed:Partial<Config['wiki']> = {};
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split('=');
        var key = decodeURIComponent(pair[0]);
        if (key.length > 0) {
            parsed[key as keyof Config['wiki']] = decodeURIComponent(pair[1]);
        }
    }
    return parsed;
  };

  const getConfig = ():Config['wiki'] => {
    const configOverrides = getQueryVariables();
    const RE_WIKI_NAME = /^\/w\/([A-Za-z0-9-_]+)\/?$/;
    const wikiNameInPath = window.location.pathname.match(RE_WIKI_NAME);
    if (wikiNameInPath) {
      configOverrides.wikiName = wikiNameInPath[1];
    }
    return Object.assign({}, config.wiki, configOverrides);
  };

  (document.getElementById('user-signed-in') as any).style.display = 'block';
  (document.getElementById('user-signed-out') as any).style.display = 'none';
  (document.getElementById('name') as any).textContent = user.displayName;
  (document.getElementById('email') as any).textContent = user.email;
  (document.getElementById('phone') as any).textContent = user.phoneNumber;
  let photoURL
  if (user.photoURL) {
    photoURL = user.photoURL;
    // Append size to the photo URL for Google hosted images to avoid requesting
    // the image with its original resolution (using more bandwidth than needed)
    // when it is going to be presented in smaller size.
    if ((photoURL.indexOf('googleusercontent.com') != -1) ||
        (photoURL.indexOf('ggpht.com') != -1)) {
      photoURL = photoURL + '?sz=' +
          document.getElementById('photo')?.clientHeight;
    }
    (document.getElementById('photo') as any).src = photoURL;
    (document.getElementById('photo') as any).style.display = 'block';
  } else {
    (document.getElementById('photo') as any).style.display = 'none';
  }
  // --- start tiddlywiki ---
  // set getIdToken function used by syncadaptor (required for token refresh to automatically work).
  ($tw as any)._pnwiki = {
    getIdToken: () => user.getIdToken()
  }
  // get first fb auth id token
  const firebaseAuthTokenData = await getAuthTokenData(user);
  const effectiveConfig = getConfig();
  // TODO: handle loadTiddler error
  let namespacedTiddlers;
  let tiddlers;
  try {
    let client = new HTTPStoreClient(
      effectiveConfig.wikiName,
      new FetchHTTPTransport(effectiveConfig.apiEndpoint, () => user.getIdToken()));
    namespacedTiddlers = await client.readFromRecipe(effectiveConfig.recipe);
    tiddlers = mapOrApply(namespacedTiddler => Object.assign({}, namespacedTiddler.tiddler, namespacedTiddler.tiddler.fields), namespacedTiddlers) as TW5TiddlerFields[];
  } catch (err) {
      const lacksPermission = err.response.status === 403 && (!firebaseAuthTokenData.claims.hasOwnProperty("_"+effectiveConfig.wikiName) || firebaseAuthTokenData.claims["_"+effectiveConfig.wikiName] < 2);
      if (lacksPermission) {
          // This is a terrible hack: abuse the TW5 built in error popup to notify the user of lack of permissions
          $tw.language = {getString: label => label === "Buttons/Close/Caption" ? "close" : ""};
          $tw.utils.error(`Hi ${user.displayName}! It seems like you do not have sufficient permissions to access wiki ${effectiveConfig.wikiName}. If this is your first time logging in or you have recently been given access, try reloading the page.`);
      } else {
        $tw.utils.error(err.message);
      }
      return;
  }
  // save tiddlers for direct access from synacadapter
  // TODO:
  ($tw as any)._pnwiki.namespacedTiddlers = namespacedTiddlers;
  const userData = {
    uid: user.uid,
    photo: photoURL,
    name: user.displayName,
    email: user.email,
    claims: firebaseAuthTokenData.claims
  };
  $tw.preloadTiddlerArray([{
    title: "$:/temp/user",
    ...userData
  }, {
    title: "$:/config/WikiConfig",
    type: "application/json",
    text: JSON.stringify(effectiveConfig)
  }, ...tiddlers]);
  // boot tiddlywiki5
  $tw.boot.boot();
};


/**
 * Displays the UI for a signed out user.
 */
var handleSignedOutUser = function() {
  (document.getElementById('user-signed-in') as any).style.display = 'none';
  (document.getElementById('user-signed-out') as any).style.display = 'block';
  ui.start('#firebaseui-container', getUiConfig());
};

/**
 * Deletes the user's account.
 */
var deleteAccount = function() {
  firebase.auth().currentUser?.delete().catch(function(error) {
    if (error.code == 'auth/requires-recent-login') {
      // The user's credential is too old. She needs to sign in again.
      firebase.auth().signOut().then(function() {
        // The timeout allows the message to be displayed after the UI has
        // changed to the signed out state.
        setTimeout(function() {
          alert('Please sign in again to delete your account.');
        }, 1);
      });
    }
  });
};


/**
 * Handles when the user changes the reCAPTCHA or email signInMethod config.
 */
function handleConfigChange() {
  var newRecaptchaValue = (document.querySelector(
      'input[name="recaptcha"]:checked') as any).value;
  var newEmailSignInMethodValue = (document.querySelector(
      'input[name="emailSignInMethod"]:checked') as any).value;
  location.replace(
      location.pathname + '#recaptcha=' + newRecaptchaValue +
      '&emailSignInMethod=' + newEmailSignInMethodValue);

  // Reset the inline widget so the config changes are reflected.
  ui.reset();
  ui.start('#firebaseui-container', getUiConfig());
}

function getRecaptchaMode() {
  var config = parseQueryString(location.hash);
  return config['recaptcha'] === 'invisible' ?
      'invisible' : 'normal';
}


/**
 * @return {string} The email signInMethod from the configuration.
 */
function getEmailSignInMethod() {
  var config = parseQueryString(location.hash);
  return config['emailSignInMethod'] === 'password' ?
      'password' : 'emailLink';
}

/**
 * @param {string} queryString The full query string.
 * @return {!Object<string, string>} The parsed query parameters.
 */
function parseQueryString(queryString:string):{[key:string]:string} {
  // Remove first character if it is ? or #.
  if (queryString.length &&
      (queryString.charAt(0) == '#' || queryString.charAt(0) == '?')) {
    queryString = queryString.substring(1);
  }
  var config:{[key:string]:string} = {};
  var pairs = queryString.split('&');
  for (var i = 0; i < pairs.length; i++) {
    var pair = pairs[i].split('=');
    if (pair.length == 2) {
      config[pair[0]] = pair[1];
    }
  }
  return config;
}

/**
 * Initializes the app.
 */
const initApp = () => {
  firebase.initializeApp(config.firebase);
  // Listen to change in auth state so it displays the correct UI for when
  // the user is signed in or not.
  firebase.auth().onAuthStateChanged(function(user:firebase.User|null) {
    (document.getElementById('loading') as any).style.display = 'none';
    (document.getElementById('loaded') as any).style.display = 'block';
    user ? handleSignedInUser(user!) : handleSignedOutUser();
  });
  // Initialize the FirebaseUI Widget using Firebase.
  ui = new firebaseui.auth.AuthUI(firebase.auth());
  // Disable auto-sign in.
  ui.disableAutoSignIn();
  // document.getElementById('sign-in-with-redirect').addEventListener( 'click', signInWithRedirect);
  document.getElementById('sign-in-with-popup')?.addEventListener('click', signInWithPopup);
  document.getElementById('sign-out')?.addEventListener('click', () => firebase.auth().signOut());
  document.getElementById('delete-account')?.addEventListener('click', () => deleteAccount());
  document.getElementById('recaptcha-normal')?.addEventListener('change', handleConfigChange);
  document.getElementById('recaptcha-invisible')?.addEventListener('change', handleConfigChange);
  // Check the selected reCAPTCHA mode.
  (document.querySelector('input[name="recaptcha"][value="' + getRecaptchaMode() + '"]') as any).checked = true;
  document.getElementById('email-signInMethod-password')?.addEventListener('change', handleConfigChange);
  document.getElementById('email-signInMethod-emailLink')?.addEventListener('change', handleConfigChange);
  // Check the selected email signInMethod mode.
  (document.querySelector('input[name="emailSignInMethod"][value="' + getEmailSignInMethod() + '"]') as any).checked = true;
};

window.addEventListener('load', initApp);
