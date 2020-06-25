const test = require('ava');
const sinon = require('sinon');
// based on: https://raw.githubusercontent.com/firebase/functions-samples/master/quickstarts/uppercase/functions/test/test.offline.js
const firebaseFunctionsTest = require('firebase-functions-test')();
const admin = require('firebase-admin');
const { HTTPError } = require('../src/errors');

const frozenTimestamp = new Date(1592079909432);

let adminInitStub, persistence, getTimestampStub;

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

const before = t => {
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
};

const after = t => {
    getTimestampStub.restore();
    // Restore admin.initializeApp() to its original method.
    adminInitStub.restore();
    // Do other cleanup tasks.
    firebaseFunctionsTest.cleanup();
};

module.exports = {MockRef, frozenTimestamp, persistence: () => persistence, before, after};
