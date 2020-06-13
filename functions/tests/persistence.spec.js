const test = require('ava');
const sinon = require('sinon');
// based on: https://raw.githubusercontent.com/firebase/functions-samples/master/quickstarts/uppercase/functions/test/test.offline.js
const firebaseFunctionsTest = require('firebase-functions-test')();
const admin = require('firebase-admin');

let adminInitStub, firestore, persistence;

test.before(t => {
    // If index.js calls admin.initializeApp at the top of the file,
    // we need to stub it out before requiring index.js. This is because the
    // functions will be executed as a part of the require process.
    // Here we stub admin.initializeApp to be a dummy function that doesn't do anything.
    sinon.stub(admin, 'initializeApp');
    Object.defineProperty(admin, 'firestore', {get: () => () => sinon.stub(admin, 'firestore').returns({})});
    debugger;
    require('../src/db');
    // Now we can require index.js and save the exports inside a namespace called myFunctions.
    persistence = require('../src/persistence');
});

test.after(t => {
    // Restore admin.initializeApp() to its original method.
    adminInitStub.restore();
    // Do other cleanup tasks.
    firebaseFunctionsTest.cleanup();
});

test('read tiddler', async t => {
    const tx = {
        get: sinon.stub().returns({})
    };
    persistence.readTiddler(tx, 'wiki', ['bag'], 'title');
    // sinon.assert.calledOnceWithExactly(t.context.res.status, 400);
});
