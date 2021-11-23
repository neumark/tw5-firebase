/**
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import {} from "jasmine";

import { readFileSync, createWriteStream } from 'fs';
import http from "http";

import { initializeTestEnvironment, assertFails, assertSucceeds, RulesTestEnvironment } from '@firebase/rules-unit-testing';

import { doc, getDoc, setDoc, serverTimestamp, setLogLevel  } from 'firebase/firestore';

/** @type testing.RulesTestEnvironment */

let testEnv:RulesTestEnvironment;

const getUsers = (testEnv:RulesTestEnvironment) => ({
  anonymousDb: testEnv.unauthenticatedContext().firestore(),
  userDb: testEnv.authenticatedContext('alice').firestore(),
  adminDb: testEnv.authenticatedContext('bob', {admin: true}).firestore()
});

beforeAll(async () => {
  // Silence expected rules rejections from Firestore SDK. Unexpected rejections
  // will still bubble up and will be thrown as an error (failing the tests).
  setLogLevel('error');

  testEnv = await initializeTestEnvironment({
    projectId: 'demo-test',
    firestore: {rules: readFileSync('firestore.rules', 'utf8')},
  });

});

afterAll(async () => {
  // Delete all the FirebaseApp instances created during testing.
  // Note: this does not affect or clear any data.
  await testEnv.cleanup();

  // Write the coverage report to a file
  const coverageFile = 'firestore-coverage.html';
  const fstream = createWriteStream(coverageFile);
  await new Promise((resolve, reject) => {
    const { host, port } = testEnv.emulators.firestore ?? {host: "localhost", port: 8080};
    const quotedHost = host.includes(':') ? `[${host}]` : host;
    http.get(`http://${quotedHost}:${port}/emulator/v1/projects/${testEnv.projectId}:ruleCoverage.html`, (res) => {
      res.pipe(fstream, { end: true });

      res.on("end", resolve);
      res.on("error", reject);
    });
  });

  console.log(`View firestore rule coverage information at ${coverageFile}\n`);
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

const tiddlerPath = ({
  wiki="testWiki",
  bag="user:alice",
  title="testTiddler"}:Partial<{wiki:string,bag:string,title:string}>={}) => `tw5-firestore-wikis/${wiki}/bags/${bag}/tiddlers/${title}`

describe("Private bag access", () => {
  it('only user can read their own bag', async function() {
    // Setup: Create documents in DB for testing (bypassing Security Rules).
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), tiddlerPath()), { text: 'asdf' });
    });

    // user can read
    await assertSucceeds(getDoc(doc(getUsers(testEnv).userDb, tiddlerPath())));
    // admin is another user, cannot read
    await assertFails(getDoc(doc(getUsers(testEnv).adminDb, tiddlerPath())));
    // anonymous cannot read
    await assertFails(getDoc(doc(getUsers(testEnv).anonymousDb, tiddlerPath())));
  });

  it('only user can write their own bag', async function() {
    // Setup: Create documents in DB for testing (bypassing Security Rules).
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), tiddlerPath()), { text: 'asdf', version: 1 });
    });


    // admin is another user, cannot write
    await assertFails(setDoc(doc(getUsers(testEnv).adminDb, tiddlerPath()), {text: "asdf2", version: 2}));
    // anonymous cannot write
    await assertFails(setDoc(doc(getUsers(testEnv).anonymousDb, tiddlerPath()), {text: "asdf2", version: 2}));
    // user can write
    await assertSucceeds(setDoc(doc(getUsers(testEnv).userDb, tiddlerPath()), {text: "asdf2", version: 2}));
  });
})

describe("tiddler version locking", () => {

  it('updates require version to be incremented by exactly 1', async function() {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), tiddlerPath()), { text: 'asdf', version: 1 });
    });

    // version is the same: cannot write
    await assertFails(setDoc(doc(getUsers(testEnv).userDb, tiddlerPath()), {text: "asdf2", version: 1}));
    // version is too high: cannot write
    await assertFails(setDoc(doc(getUsers(testEnv).userDb, tiddlerPath()), {text: "asdf2", version: 3}));
    // version is correct: user can write
    await assertSucceeds(setDoc(doc(getUsers(testEnv).userDb, tiddlerPath()), {text: "asdf2", version: 2}));
  });

  it('create requires version to be exactly 0', async function() {
    // version is the same: cannot write
    await assertFails(setDoc(doc(getUsers(testEnv).userDb, tiddlerPath()), {text: "asdf2", version: 1}));
    // version is too high: cannot write
    await assertFails(setDoc(doc(getUsers(testEnv).userDb, tiddlerPath()), {text: "asdf2"}));
    // version is correct: user can write
    await assertSucceeds(setDoc(doc(getUsers(testEnv).userDb, tiddlerPath()), {text: "asdf2", version: 0}));
  });
})

describe("Public user profiles", () => {
  it('should let anyone read any profile', async function() {
    // Setup: Create documents in DB for testing (bypassing Security Rules).
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users/foobar'), { foo: 'bar' });
    });

    // Then test security rules by trying to read it using the client SDK.
    await assertSucceeds(getDoc(doc(getUsers(testEnv).anonymousDb, 'users/foobar')));
  });

  it('should not allow users to read from a random collection', async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();

    await assertFails(getDoc(doc(unauthedDb, 'foo/bar')));
  });

  it("should allow ONLY signed in users to create their own profile with required `createdAt` field", async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();

    await assertSucceeds(setDoc(doc(aliceDb, 'users/alice'), {
      birthday: "January 1",
      createdAt: serverTimestamp(),
    }));

    // Signed in user with required fields for others' profile
    await assertFails(setDoc(doc(aliceDb, 'users/bob'), {
      birthday: "January 1",
      createdAt: serverTimestamp(),
    }));

    // Signed in user without required fields
    await assertFails(setDoc(doc(aliceDb, 'users/alice'), {
      birthday: "January 1",
    }));

  });
});

describe("Chat rooms", () => {
  it('should ONLY allow users to create a room they own', async function() {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();

    await assertSucceeds(setDoc(doc(aliceDb, 'rooms/snow'), {
      owner: "alice",
      topic: "All Things Snowboarding",
    }));

  });

  it('should not allow room creation by a non-owner', async function() {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();

    await assertFails(setDoc(doc(aliceDb, 'rooms/boards'), {
      owner: "bob",
      topic: "All Things Snowboarding",
    }));
  });

  it('should not allow an update that changes the room owner', async function(){
    const aliceDb = testEnv.authenticatedContext('alice').firestore();

    await assertFails(setDoc(doc(aliceDb, 'rooms/snow'), {
      owner: "bob",
      topic: "All Things Snowboarding",
    }));
  });
});
