const test = require('ava');
const sinon = require('sinon');
// based on: https://raw.githubusercontent.com/firebase/functions-samples/master/quickstarts/uppercase/functions/test/test.offline.js
const firebaseFunctionsTest = require('firebase-functions-test')();
const admin = require('firebase-admin');

let adminInitStub, persistence, mockTimestamp = {toDate: () => new Date(1592079909432)};

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
    Object.defineProperty(admin, 'firestore', {get: () => () => mockDb});
    // Now we can require index.js and save the exports inside a namespace called myFunctions.
    persistence = require('../src/persistence');
});

test.after(t => {
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
