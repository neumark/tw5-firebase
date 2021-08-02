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
import { HTTPStoreClient } from '@tw5-firebase/shared/src/apiclient/http-store-client';
import { defineOuterFrameAPIMethod, makeInnerFrameAPIClient, makeRPC } from '@tw5-firebase/frontend-shared/src/interframe';
import { TiddlerVersionManager } from './tiddler-version-manager/tvm';
import { batchMap } from '@tw5-firebase/shared/src/util/map';
import { SingleWikiNamespacedTiddler } from '@tw5-firebase/shared/src/api/bag-api';
import { User } from '@tw5-firebase/shared/src/model/user';
import { isVoid } from '@tw5-firebase/shared/src/util/is-void';
import { HTTPTransport } from '@tw5-firebase/shared/src/apiclient/http-transport';
import { OuterFrameStoreProxy } from './tiddler-version-manager/local-change-listener';
declare let __BUILD_CONFIG__: string;

let ui: firebaseui.auth.AuthUI;

const RE_WIKI_NAME = /^\/w\/([A-Za-z0-9-_]+)\/?$/;

const INTERFRAME_TIDDLER_TRANSFER_BATCH_SIZE = 50;

const unNullable = (s:string|null):string|undefined => isVoid(s) ? undefined : s as string;

const firebaseToNativeUser = (user:firebase.User):User => ({
  userId: user.uid,
  phone_number: unNullable(user.phoneNumber),
  email: unNullable(user.email),
  email_verified: user.emailVerified,
  picture: unNullable(user.photoURL),
  name: unNullable(user.displayName)
})

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

const getWikiInitState = async (transport:HTTPTransport, config: OuterFrameBuildConfig, user: firebase.User): Promise<WikiInitState> => {
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
  iframe.height = String(
    window.innerHeight ?? window.document?.documentElement?.clientHeight ?? window.document?.body?.clientHeight,
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
    const transport = new FetchHTTPTransport(config.apiEndpoint, () => user.getIdToken());
    const wikiInitState = await getWikiInitState(transport, config, user);
    const storeClient = new HTTPStoreClient(config.wikiName, transport);
    const tvm = new TiddlerVersionManager(config.wikiName, wikiInitState.resolvedRecipe.read);
    const outerFrameStoreProxy = new OuterFrameStoreProxy(tvm, storeClient);
    const rpc = makeRPC();
    let iframe:HTMLIFrameElement;
    defineOuterFrameAPIMethod(rpc, 'create', outerFrameStoreProxy.create.bind(outerFrameStoreProxy));
    defineOuterFrameAPIMethod(rpc, 'update', outerFrameStoreProxy.update.bind(outerFrameStoreProxy));
    defineOuterFrameAPIMethod(rpc, 'del', outerFrameStoreProxy.del.bind(outerFrameStoreProxy));
    defineOuterFrameAPIMethod(rpc, 'innerIframeReady', async () => {
      const client = makeInnerFrameAPIClient(rpc, iframe.contentWindow!);
      console.log("inner iframe ready");
      // TODO: wait until the last tiddler in the bag is read, not 1 sec.
      await sleep(1000);
      const data = tvm.getAllTiddlers();
      await batchMap(async (tiddlers:SingleWikiNamespacedTiddler[]) => {
        await client('saveTiddlers', [tiddlers])
      }, data, INTERFRAME_TIDDLER_TRANSFER_BATCH_SIZE);
      await client('initWiki', [{user: firebaseToNativeUser(user)}])
    });
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
