import 'reflect-metadata';
import firebase from 'firebase';
import * as firebaseui from 'firebaseui';
import { WikiInitState, OuterFrameBuildConfig } from '@tw5-firebase/shared/src/model/config';
import { parseQueryString } from '@tw5-firebase/shared/src/util/querystring';
import { deleteAccount, handleConfigChange, handleSignedInUser, handleSignedOutUser, signInWithPopup } from './login';
import { replaceUrlEncoded } from '@tw5-firebase/shared/src/util/templates';
import { sleep } from '@tw5-firebase/shared/src/util/sleep';
import { ROUTES } from '@tw5-firebase/shared/src/api/routes';
import { FetchHTTPTransport } from '@tw5-firebase/frontend-shared/src/fetch-http-transport';
import { TiddlerVersionManager } from './tiddler-version-manager/tvm';
import type {MiniIframeRPC} from 'mini-iframe-rpc';
import { batchMap } from '@tw5-firebase/shared/src/util/map';
import { SingleWikiNamespacedTiddler } from '@tw5-firebase/shared/src/api/bag-api';
declare let __BUILD_CONFIG__: string;

let ui: firebaseui.auth.AuthUI;

const RE_WIKI_NAME = /^\/w\/([A-Za-z0-9-_]+)\/?$/;

const getMergedBuildConfig = (): OuterFrameBuildConfig => {
  // start with hardcoded configuration
  const config = JSON.parse(__BUILD_CONFIG__) as OuterFrameBuildConfig;
  // extend with hash parameters
  const urlHashConfig = parseQueryString(location.search) as Partial<OuterFrameBuildConfig>;
  Object.assign(config, urlHashConfig);
  // override wiki name based on path part of url if set
  const wikiNameInPath = window.location.pathname.match(RE_WIKI_NAME);
  if (wikiNameInPath) {
    config.wikiName = wikiNameInPath[1];
  }
  return config;
};

const getWikiInitState = async (config: OuterFrameBuildConfig, user: firebase.User): Promise<WikiInitState> => {
  const transport = new FetchHTTPTransport(config.apiEndpoint, () => user.getIdToken());
  const wikiInitState: WikiInitState = await transport.request({
    // remove trailing slash
    urlPath: replaceUrlEncoded(ROUTES.RESTAPI_INIT, { wiki: config.wikiName }).substr(1),
  });
  return wikiInitState;
};

const initFirebase = (config: OuterFrameBuildConfig) => firebase.initializeApp(config);

const createWikiIframe = () => {
  const parentElement = document.getElementById('wiki-frame-parent');
  const iframe = document.createElement('iframe');
  // see: https://stackoverflow.com/questions/25387977/typescript-iframe-sandbox-property-undefined-domsettabletokenlist-has-no-cons
  (<any>iframe).sandbox = 'allow-forms allow-scripts';
  // todo: this could be configurable to use a different tw5 build for eg mobile devices / translations, etc
  iframe.src = 'inner.html';
  iframe.width = String(
    window.innerWidth ?? window.document?.documentElement?.clientWidth ?? window.document?.body?.clientWidth,
  );
  parentElement?.appendChild(iframe);
  return iframe;
};

/**
 * Initializes the app.
 */
const initApp = async () => {
  const config = getMergedBuildConfig();
  initFirebase(config);

  const startTW5 = async (user: firebase.User) => {
    const wikiInitState = await getWikiInitState(config, user);
    const tvm = new TiddlerVersionManager(config.wikiName, wikiInitState.resolvedRecipe.read);
    const rpc = new (window as any)["mini-iframe-rpc"].MiniIframeRPC({
      defaultInvocationOptions: {
        retryAllFailures: false,
        timeout: 0,
        retryLimit: 0,
      },
    }) as MiniIframeRPC;
    let iframe:HTMLIFrameElement;
    rpc.register('innerIframeReady', async () => {
      console.log("inner iframe ready");
      await sleep(1000);
      const data = tvm.getAllTiddlers();
      await batchMap(async (tiddlers:SingleWikiNamespacedTiddler[]) => {
        await rpc.invoke(iframe.contentWindow!, null, 'saveTiddlers', [tiddlers])
      },data, 50);
      await rpc.invoke(iframe.contentWindow!, null, 'initWiki', [data])
    })
    tvm.setupListeners();
    // TODO: based on wikiInitState.lastTiddlers, we could figure out when the last tiddler in each bag has be read,
    // but not worrying about this right now.
    iframe = createWikiIframe();
    console.log(tvm);
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
  document
    .getElementById('email-signInMethod-password')
    ?.addEventListener('change', () => handleConfigChange(startTW5));
  document
    .getElementById('email-signInMethod-emailLink')
    ?.addEventListener('change', () => handleConfigChange(startTW5));
  // Check the selected email signInMethod mode.
  //(document.querySelector('input[name="emailSignInMethod"][value="' + getEmailSignInMethod() + '"]') as any).checked = true;
};

window.addEventListener('load', initApp);
