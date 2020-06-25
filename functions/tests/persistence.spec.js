const test = require('ava');
const sinon = require('sinon');
const testbase = require('./testbase');
const { HTTPError } = require('../src/errors');

const mockTimestamp = {toDate: () => testbase.frozenTimestamp};

test.before(testbase.before);
test.after(testbase.after);

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
    const tiddler = await testbase.persistence().readTiddler({ get }, 'wiki', ['bag1', 'bag2', 'bag3'], 'title');
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
    const tiddler = await testbase.persistence().readTiddler({ get }, 'wiki', ['bag1', 'bag2', 'bag3'], 'title');
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
        created: testbase.frozenTimestamp,
        modified: testbase.frozenTimestamp,
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
    const updatedTiddler = await testbase.persistence().writeTiddler({ get, set }, email, 'wiki', 'bag', receivedTiddler1)
    t.is(calls, 2);
    t.deepEqual(updatedTiddler, {
      created: storedTiddler.created,
      creator: storedTiddler.creator,
      modified: testbase.frozenTimestamp,
      modifier: email,
      revision: '20200613202509432:j@j.com',
      text: receivedTiddler1.text,
      title: receivedTiddler1.title,
   });
   await t.throwsAsync(() => testbase.persistence().writeTiddler({ get, set }, email, 'wiki', 'bag', receivedTiddler2), {instanceOf: HTTPError, message: 'revision conflict: current is rev1, received update to badRevision'})
});
