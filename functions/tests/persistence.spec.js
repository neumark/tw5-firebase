const test = require('ava');
const sinon = require('sinon');
// based on: https://raw.githubusercontent.com/firebase/functions-samples/master/quickstarts/uppercase/functions/test/test.offline.js
const firebaseFunctionsTest = require('firebase-functions-test')();
const admin = require('firebase-admin');
const { HTTPError } = require('../src/errors');

const frozenTimestamp = new Date(1592079909432);

let adminInitStub, persistence, mockTimestamp = {toDate: () => frozenTimestamp}, getTimestampStub;

class MockRef extends Array {
  // TODO: validate doc / collection based on existing array length
  doc(name) {
    name.split("/").forEach(n => this.push(n));
    return this;
  }
  collection(name) {
    return this.doc(name);
  }
}

test.before(t => {
    // If index.js calls admin.initializeApp at the top of the file,
    // we need to stub it out before requiring index.js. This is because the
    // functions will be executed as a part of the require process.
    // Here we stub admin.initializeApp to be a dummy function that doesn't do anything.
    adminInitStub = sinon.stub(admin, 'initializeApp');
    const mockDb = {
        collection: x => (new MockRef()).collection(x)
    };
    const mockFirestoreFn = () => mockDb;
    // admin.firestore.Timestamp.fromDate is called in prepareTiddler, so we must mock it as well.
    mockFirestoreFn.Timestamp = {fromDate: x => x};
    Object.defineProperty(admin, 'firestore', {get: () => mockFirestoreFn});
    const dateModule = require('../src/date');
    getTimestampStub = sinon.stub(dateModule, 'getTimestamp');
    getTimestampStub.returns(frozenTimestamp);
    // Now we can require index.js and save the exports inside a namespace called myFunctions.
    persistence = require('../src/persistence');
});

test.after(t => {
    getTimestampStub.restore();
    // Restore admin.initializeApp() to its original method.
    adminInitStub.restore();
    // Do other cleanup tasks.
    firebaseFunctionsTest.cleanup();
});

test('read tiddler from first bag where it is found 1', async t => {
    t.plan(5);
    let callsToGet = 0;
    const get = ref => {
        callsToGet += 1;
        t.deepEqual([].concat(ref), ['wikis', 'wiki', 'bag' + callsToGet, 'title']);
        return {
            exists: true,
            data: () => ({text: ref.join("/"),
                          created: mockTimestamp,
                          modified: mockTimestamp})
        };
    };
    const tiddler = await persistence.readTiddler({ get }, 'wiki', ['bag1', 'bag2', 'bag3'], 'title');
    t.is(callsToGet, 3);
    t.deepEqual(tiddler, {
        bag: 'bag1',
        created: '20200613202509432',
        modified: '20200613202509432',
        text: "wikis/wiki/bag1/title"});
});

test('read tiddler from first bag where it is found 2', async t => {
    t.plan(5);
    let callsToGet = 0;
    const get = ref => {
        callsToGet += 1;
        t.deepEqual([].concat(ref), ['wikis', 'wiki', 'bag' + callsToGet, 'title']);
        return {
            exists: callsToGet === 2,
            data: callsToGet !== 2 ? () => null : () => ({text: ref.join("/"),
                          created: mockTimestamp,
                          modified: mockTimestamp})
        };
    };
    const tiddler = await persistence.readTiddler({ get }, 'wiki', ['bag1', 'bag2', 'bag3'], 'title');
    t.is(callsToGet, 3);
    t.deepEqual(tiddler, {
        bag: 'bag2',
        created: '20200613202509432',
        modified: '20200613202509432',
        text: "wikis/wiki/bag2/title"});
});

test('writeTiddler verifies revision, and performs write only when they match', async t => {
    t.plan(5);
    let calls = 0;
    const storedTiddler = {
        title: "title1",
        text: "text1",
        revision: "rev1",
        created: frozenTimestamp,
        modified: frozenTimestamp,
        creator: "b@b.com"
    };
    const receivedTiddler1 = {
        title: "title2",
        text: "text2",
        revision: storedTiddler.revision
    };
    const receivedTiddler2 = Object.assign({}, receivedTiddler1, {
        revision: "badRevision"
    });
    const get = ref => {
        calls += 1;
        t.deepEqual([].concat(ref), ['wikis', 'wiki', 'bag', receivedTiddler1.title]);
        return {
            exists: true,
            data: () => storedTiddler
        };
    };
    const set = (...args) => {
        calls += 1;
    };
    const email = 'j@j.com';
    const updatedTiddler = await persistence.writeTiddler({ get, set }, email, 'wiki', 'bag', receivedTiddler1)
    t.is(calls, 2);
    t.deepEqual(updatedTiddler, {
      created: storedTiddler.created,
      creator: storedTiddler.creator,
      modified: frozenTimestamp,
      modifier: email,
      revision: '20200613202509432:j@j.com',
      text: receivedTiddler1.text,
      title: receivedTiddler1.title,
   });
   await t.throwsAsync(() => persistence.writeTiddler({ get, set }, email, 'wiki', 'bag', receivedTiddler2), {instanceOf: HTTPError, message: 'revision conflict: current is rev1, received update to badRevision'})
});
