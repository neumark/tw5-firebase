/*\
title: $:/pn-wiki/app.js
type: application/javascript
\*/



/*
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the
 * License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * FirebaseUI initialization to be used in a Single Page application context.
 */

/**
 * @return {!Object} The FirebaseUI config.
 */

function getUiConfig() {
  return {
    'callbacks': {
      // Called when the user has been successfully signed in.
      'signInSuccessWithAuthResult': function(authResult, redirectUrl) {
        if (authResult.user) {
          handleSignedInUser(authResult.user);
        }
        if (authResult.additionalUserInfo) {
          document.getElementById('is-new-user').textContent =
              authResult.additionalUserInfo.isNewUser ?
              'New User' : 'Existing User';
        }
        // Do not redirect.
        return false;
      }
    },
    // Opens IDP Providers sign-in flow in a popup.
    'signInFlow': 'popup',
    'signInOptions': [
      // TODO(developer): Remove the providers you don't need for your app.
      {
        provider: firebase.auth.GoogleAuthProvider.PROVIDER_ID,
        // Required to enable this provider in One-Tap Sign-up.
        authMethod: 'https://accounts.google.com',
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
    // Terms of service url.
    'tosUrl': '/tos.html',
    // Privacy policy url.
    'privacyPolicyUrl': '/privacy.html',
    'credentialHelper': firebaseui.auth.CredentialHelper.ACCOUNT_CHOOSER_COM
  };
}

// Initialize the FirebaseUI Widget using Firebase.
var ui = new firebaseui.auth.AuthUI(firebase.auth());
// Disable auto-sign in.
ui.disableAutoSignIn();


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

const getAuthTokenData = async user => {
    const idTokenResult = await /*firebase.auth().currentUser*/user.getIdTokenResult(true);
    return idTokenResult;
};


/**
 * Displays the UI for a signed in user.
 * @param {!firebase.User} user
 */
var handleSignedInUser = async function(user) {

  const getQueryVariables = () => {
    var query = window.location.search.substring(1);
    var vars = query.split('&');
    const parsed = {};
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split('=');
        var key = decodeURIComponent(pair[0]);
        if (key.length > 0) {
            parsed[key] = decodeURIComponent(pair[1]);
        }
    }
    return parsed;
  };

  const getConfig = () => {
    const configOverrides = getQueryVariables();
    const RE_WIKI_NAME = /^\/w\/([A-Za-z0-9-_]+)\/?$/;
    const wikiNameInPath = window.location.pathname.match(RE_WIKI_NAME);
    if (wikiNameInPath) {
      configOverrides.wikiName = wikiNameInPath[1];
    }
    const config = Object.assign({}, window.$tw._pnwiki.config.wiki, configOverrides);
    return config;
  };
  
  document.getElementById('user-signed-in').style.display = 'block';
  document.getElementById('user-signed-out').style.display = 'none';
  document.getElementById('name').textContent = user.displayName;
  document.getElementById('email').textContent = user.email;
  document.getElementById('phone').textContent = user.phoneNumber;
  let photoURL  
  if (user.photoURL) {
    photoURL = user.photoURL;
    // Append size to the photo URL for Google hosted images to avoid requesting
    // the image with its original resolution (using more bandwidth than needed)
    // when it is going to be presented in smaller size.
    if ((photoURL.indexOf('googleusercontent.com') != -1) ||
        (photoURL.indexOf('ggpht.com') != -1)) {
      photoURL = photoURL + '?sz=' +
          document.getElementById('photo').clientHeight;
    }
    document.getElementById('photo').src = photoURL;
    document.getElementById('photo').style.display = 'block';
  } else {
    document.getElementById('photo').style.display = 'none';
  }
  // --- start tiddlywiki ---
  // set getIdToken function used by syncadaptor (required for token refresh to automatically work).
  window.$tw._pnwiki.getIdToken = () => user.getIdToken();
  // get first fb auth id token
  const firebaseAuthTokenData = await getAuthTokenData(user);
  const config = getConfig();
  // TODO: handle loadTiddler error
  let tiddlers;
  try {
    tiddlers = await window.$tw._pnwiki.adaptorCore.loadTiddler(
      config,
      window.$tw._pnwiki.getIdToken());
  } catch (err) {
      const lacksPermission = err.response.status === 403 && (!firebaseAuthTokenData.claims.hasOwnProperty("_"+config.wikiName) || firebaseAuthTokenData.claims["_"+config.wikiName] < 2);
      if (lacksPermission) {
          // This is a terrible hack: abuse the TW5 built in error popup to notify the user of lack of permissions
          $tw.language = {getString: label => label === "Buttons/Close/Caption" ? "close" : ""};
          $tw.utils.error(`Hi ${user.displayName}! It seems like you do not have sufficient permissions to access wiki ${config.wikiName}. If this is your first time logging in or you have recently been given access, try reloading the page.`);
      } else {
        $tw.utils.error(err.message);
      }
      return;
  }
  // save tiddlers for direct access from synacadapter
  window.$tw._pnwiki.initialTidders = tiddlers;
  const userData = {
    uid: user.uid,
    photo: photoURL,
    name: user.displayName,
    email: user.email,
    claims: firebaseAuthTokenData.claims
  };
  window.$tw.preloadTiddlerArray([{
    title: "$:/temp/user",
    type: "application/json",
    text: JSON.stringify(userData)
  }, {
    title: "$:/config/firestore-syncadaptor-client/config",
    type: "application/json",
    text: JSON.stringify(config)
  }, ...tiddlers]);
  // boot tiddlywiki5
  window.$tw.boot.boot();
};


/**
 * Displays the UI for a signed out user.
 */
var handleSignedOutUser = function() {
  document.getElementById('user-signed-in').style.display = 'none';
  document.getElementById('user-signed-out').style.display = 'block';
  ui.start('#firebaseui-container', getUiConfig());
};

// Listen to change in auth state so it displays the correct UI for when
// the user is signed in or not.
firebase.auth().onAuthStateChanged(function(user) {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('loaded').style.display = 'block';
  user ? handleSignedInUser(user) : handleSignedOutUser();
});

/**
 * Deletes the user's account.
 */
var deleteAccount = function() {
  firebase.auth().currentUser.delete().catch(function(error) {
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
  var newRecaptchaValue = document.querySelector(
      'input[name="recaptcha"]:checked').value;
  var newEmailSignInMethodValue = document.querySelector(
      'input[name="emailSignInMethod"]:checked').value;
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
function parseQueryString(queryString) {
  // Remove first character if it is ? or #.
  if (queryString.length &&
      (queryString.charAt(0) == '#' || queryString.charAt(0) == '?')) {
    queryString = queryString.substring(1);
  }
  var config = {};
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
var initApp = function() {
  // document.getElementById('sign-in-with-redirect').addEventListener( 'click', signInWithRedirect);
  document.getElementById('sign-in-with-popup').addEventListener(
      'click', signInWithPopup);
  document.getElementById('sign-out').addEventListener('click', function() {
    firebase.auth().signOut();
  });
  document.getElementById('delete-account').addEventListener(
      'click', function() {
        deleteAccount();
      });

  document.getElementById('recaptcha-normal').addEventListener(
      'change', handleConfigChange);
  document.getElementById('recaptcha-invisible').addEventListener(
      'change', handleConfigChange);
  // Check the selected reCAPTCHA mode.
  document.querySelector(
      'input[name="recaptcha"][value="' + getRecaptchaMode() + '"]')
      .checked = true;

  document.getElementById('email-signInMethod-password').addEventListener(
      'change', handleConfigChange);
  document.getElementById('email-signInMethod-emailLink').addEventListener(
      'change', handleConfigChange);
  // Check the selected email signInMethod mode.
  document.querySelector(
      'input[name="emailSignInMethod"][value="' + getEmailSignInMethod() + '"]')
      .checked = true;
};

window.addEventListener('load', initApp);
