const test = require('ava');
const sinon = require('sinon');
const testbase = require('./testbase');
const { HTTPError } = require('../src/errors');
const { GLOBAL_CONTENT_BAG, GLOBAL_SYSTEM_BAG } = require('../src/constants'); 

const mockTimestamp = {toDate: () => testbase.frozenTimestamp};

let role, bag;

test.before(t => {
    testbase.before(t);
    role = require('../src/role');
    bag = require('../src/bag');
});

test.after(t => {
    testbase.after(t);
});

test('verify access by role', async t => {
    t.plan(8);
    const get = ref => {
        t.deepEqual([].concat(ref), ["wikis", "wiki", "mybag", "mybag_policy"]);
        return {
            exists: true,
            data: () => ({
                text: JSON.stringify({
                    write: [{role: "admin"}],
                    read: [{role: "editor"}]
                }),
                created: mockTimestamp,
                modified: mockTimestamp
            })
        };
    };
    const user = {email: "j@j.com"};
    t.is(true, await bag.hasAccess({get}, "wiki", "mybag", role.ROLES.editor, user, "read"));
    t.is(false, await bag.hasAccess({get}, "wiki", "mybag", role.ROLES.anonymous, user, "read"));
    t.is(true, await bag.hasAccess({get}, "wiki", "mybag", role.ROLES.admin, user, "write"));
    t.is(false, await bag.hasAccess({get}, "wiki", "mybag", role.ROLES.editor, user, "write"));
});

test('verify access by user', async t => {
    t.plan(12);
    const get = ref => {
        t.deepEqual([].concat(ref), ["wikis", "wiki", "mybag", "mybag_policy"]);
        return {
            exists: true,
            data: () => ({
                text: JSON.stringify({
                    write: [{role: "admin"}, {user: "w@j.com"}],
                    read: [{role: "editor"}, {user: "r@j.com"}]
                }),
                created: mockTimestamp,
                modified: mockTimestamp
            })
        };
    };
    t.is(true, await bag.hasAccess({get}, "wiki", "mybag", role.ROLES.authenticated, {email: "r@j.com"}, "read"), "user explicitly given read permission on bag");
    t.is(false, await bag.hasAccess({get}, "wiki", "mybag", role.ROLES.reader, {email: "w@j.com"}, "read"), "no user-specific permission for read access, role insufficient");
    t.is(true, await bag.hasAccess({get}, "wiki", "mybag", role.ROLES.admin, {email: "w@j.com"}, "read"), "no user-specific permission for read access, role sufficient");
    t.is(true, await bag.hasAccess({get}, "wiki", "mybag", role.ROLES.authenticated, {email: "w@j.com"}, "write"), "user explicitly given read permission on bag");
    t.is(false, await bag.hasAccess({get}, "wiki", "mybag", role.ROLES.reader, {email: "r@j.com"}, "write"), "no user-specific permission for read access, role insufficient");
    t.is(true, await bag.hasAccess({get}, "wiki", "mybag", role.ROLES.admin, {email: "r@j.com"}, "write"), "no user-specific permission for read access, role sufficient");
});


test('tiddler constraints', async t => {
    t.plan(14);
    const txReturningConstraint = (...constraints) => ({
        get: ref => {
            t.deepEqual([].concat(ref), ["wikis", "wiki", "mybag", "mybag_policy"]);
            return {
                exists: true,
                data: () => ({
                    text: JSON.stringify({
                        write: [{role: "admin"}],
                        read: [{role: "admin"}],
                        constraints
                    }),
                    created: mockTimestamp,
                    modified: mockTimestamp
                })
            };
        }
    });
    t.is(true, await bag.hasAccess(txReturningConstraint("isSystemTiddler"), "wiki", "mybag", role.ROLES.admin, {email: "r@j.com"}, "write", {title: "$:/SystemTitle"}));
    t.is(false, await bag.hasAccess(txReturningConstraint("isSystemTiddler"), "wiki", "mybag", role.ROLES.admin, {email: "r@j.com"}, "write", {title: "NonSystemTitle"}));
    t.is(true, await bag.hasAccess(txReturningConstraint("isSystemTiddler"), "wiki", "mybag", role.ROLES.admin, {email: "r@j.com"}, "write", ), "constraints ignored if not tiddler passed in");

    t.is(false, await bag.hasAccess(txReturningConstraint("!isSystemTiddler"), "wiki", "mybag", role.ROLES.admin, {email: "r@j.com"}, "write", {title: "$:/SystemTitle"}));
    t.is(true, await bag.hasAccess(txReturningConstraint("!isSystemTiddler"), "wiki", "mybag", role.ROLES.admin, {email: "r@j.com"}, "write", {title: "NonSystemTitle"}));
    t.is(false, await bag.hasAccess(txReturningConstraint("isSystemTiddler", "isPersonalTiddler"), "wiki", "mybag", role.ROLES.admin, {email: "r@j.com"}, "write", {title: "$:/SystemTitle"}), "Multiple constraints are AND-ed together");
    debugger;
    t.is(true, await bag.hasAccess(txReturningConstraint("isSystemTiddler", "isPersonalTiddler"), "wiki", "mybag", role.ROLES.admin, {email: "r@j.com"}, "write", {title: "$:/SystemTitle", tags: ["personal"]}), "Multiple constraints are AND-ed together");
});


test('default bag policies', async t => {
    // t.plan(1);
    const get = ref => {
        return { exists: false };
    };
    const user = {email: "r@j.com"};
    // personal bag
    t.is(true, await bag.hasAccess({get}, "wiki", bag.personalBag(user.email), role.ROLES.authenticated, user, "read"), "any user can read from their personal bag");
    t.is(true, await bag.hasAccess({get}, "wiki", bag.personalBag(user.email), role.ROLES.authenticated, user, "write", {title: "$:/StoryList"}), "any user can write to their personal bag");
    t.is(false, await bag.hasAccess({get}, "wiki", bag.personalBag(user.email), role.ROLES.authenticated, user, "write", {title: "StoryList"}), "if constraints arent met, cannot write");

    // GLOBAL_CONTENT_BAG
    t.is(false, await bag.hasAccess({get}, "wiki", GLOBAL_CONTENT_BAG, role.ROLES.authenticated, user, "read"), "need reader role to read");
    t.is(true, await bag.hasAccess({get}, "wiki", GLOBAL_CONTENT_BAG, role.ROLES.reader, user, "read"), "need reader role to read");
    t.is(true, await bag.hasAccess({get}, "wiki", GLOBAL_CONTENT_BAG, role.ROLES.editor, user, "write", {title: "ASDF"}), "editor can write if constraints met");

    // GLOBAL_SYSTEM_BAG
    t.is(false, await bag.hasAccess({get}, "wiki", GLOBAL_SYSTEM_BAG, role.ROLES.editor, user, "write", {title: "$:/ASDF"}), "need admin role to write");
    t.is(true, await bag.hasAccess({get}, "wiki", GLOBAL_SYSTEM_BAG, role.ROLES.admin, user, "write", {title: "$:/ASDF"}), "need admin role to write");
    t.is(true, await bag.hasAccess({get}, "wiki", GLOBAL_SYSTEM_BAG, role.ROLES.admin, user, "write", {title: "$:/ASDF"}), "editor can write if constraints met");
    t.is(false, await bag.hasAccess({get}, "wiki", GLOBAL_SYSTEM_BAG, role.ROLES.admin, user, "write", {title: "ASDF"}), "editor can write if constraints met");

});
