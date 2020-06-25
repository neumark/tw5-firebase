const test = require('ava');
const sinon = require('sinon');
const testbase = require('./testbase');
const { HTTPError } = require('../src/errors');

const mockTimestamp = {toDate: () => testbase.frozenTimestamp};

let role;

test.before(t => {
    testbase.before(t);
    role = require('../src/role');
});

test.after(t => {
    testbase.after(t);
});

test('role of user correctly determined', async t => {
    t.plan(7); // 7 because anonymous user role does not require firestore read
    const get = ref => {
        t.deepEqual([].concat(ref), ["wikis", "wiki", "system", "$:_config_firestore-syncadaptor-client_roles"]);
        return {
            exists: true,
            data: () => ({
                text: JSON.stringify({
                     "admin": ["j@j.com"],
                     "editor": ["k@j.com"],
                     "reader": ["k@j.com", "l@j.com"]
                }),
                created: mockTimestamp,
                modified: mockTimestamp
            })
        };
    };
    t.is(role.ROLES.admin, await role.getUserRole({get}, 'wiki', {email: 'j@j.com', isAuthenticated: true}), "admin user correctly identified");
    t.is(role.ROLES.anonymous, await role.getUserRole({get}, 'wiki', {isAuthenticated: false}), "anonymous user correctly identified");
    t.is(role.ROLES.editor, await role.getUserRole({get}, 'wiki', {email: 'k@j.com', isAuthenticated: true}), "if multiple roles given, highest one used");
    t.is(role.ROLES.authenticated, await role.getUserRole({get}, 'wiki', {email: 'm@j.com', isAuthenticated: true}), "default role is authenticated");
});

test('everyone has "authenticated" role if no roles tiddler found', async t => {
    t.plan(1);
    const get = ref => {
        return { exists: false };
    };
    t.is(role.ROLES.authenticated, await role.getUserRole({get}, 'wiki', {email: 'j@j.com', isAuthenticated: true}), "admin user correctly identified");
});
