const test = require('ava');
const sinon = require('sinon');
// based on: https://raw.githubusercontent.com/firebase/functions-samples/master/quickstarts/uppercase/functions/test/test.offline.js
const firebaseFunctionsTest = require('firebase-functions-test')();
const { HTTPError } = require('../src/errors');

const frozenTimestamp = new Date(1592079909432);
const mockTimestamp = {toDate: () => frozenTimestamp};

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
    t.context.db = {
        getTimestamp: () => frozenTimestamp,
        dateToFirestoreTimestamp: date => date,
        runTransaction: fn => db.runTransaction(fn),
        collectionRef: path => (new MockRef()).collection(path)
    };
};

const after = t => {
    firebaseFunctionsTest.cleanup();
};

module.exports = {MockRef, before, after, frozenTimestamp, mockTimestamp};
