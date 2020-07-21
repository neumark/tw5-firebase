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

// Your web app's Firebase configuration
  var firebaseConfig = {
    apiKey: "AIzaSyCfGMNk0mtTJIseq9jzGZ6XnYbYVE882AI",
    authDomain: "peterneumark-com.firebaseapp.com",
    databaseURL: "https://peterneumark-com.firebaseio.com",
    projectId: "peterneumark-com",
    storageBucket: "peterneumark-com.appspot.com",
    messagingSenderId: "1019270346260",
    appId: "1:1019270346260:web:2064fdcb65a50ee1c51901"
  };

firebase.initializeApp(firebaseConfig);

// Google OAuth Client ID, needed to support One-tap sign-up.
// Set to null if One-tap sign-up is not supported.
var CLIENT_ID = null; //'1019270346260-fh2s7fjmige0qlu6nonmm514rvrafbd9.apps.googleusercontent.com';

// this config may be overridden by GET parameters in URL
globalThis.wikiConfig = {
    wiki: 'pn-wiki',
    recipe: 'default',
    host: "https://europe-west3-peterneumark-com.cloudfunctions.net/wiki-app/"
};
