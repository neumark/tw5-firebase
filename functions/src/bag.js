const { GLOBAL_CONTENT_BAG, GLOBAL_SYSTEM_BAG, ROLES_TIDDLER, ACCESS_READ, ACCESS_WRITE } = require('./constants'); 
const { HTTPError, HTTP_FORBIDDEN } = require('./errors');
const { ROLES } = require('./role');
const { isDraftTiddler, isPersonalTiddler, isSystemTiddler, getConstraintChecker } = require('./tw');
const { getContentValidatingReader } = require('./persistence'); 
const { bagPolicySchema } = require('./schema');
const { username } = require('./authentication');

const personalBag = user => `user:${user.uid}`;

const readPolicy = getContentValidatingReader(bagPolicySchema);

const bagPolicyTiddler = bag => `${bag}/policy`;

const adminOnlyPolicy = {
    [ACCESS_WRITE]: [{role: "admin"}],
    [ACCESS_READ]: [{role: "admin"}],
};

const defaultPolicy = (user, bag) => {
    if (bag === personalBag(user)) {
        return {
            [ACCESS_WRITE]: [{userId: user.uid}],
            [ACCESS_READ]: [{userId: user.uid}],
            constraints: ["isPersonalTiddler"]
        };
    }
    switch (bag) {
        case GLOBAL_CONTENT_BAG:
            return {
                [ACCESS_WRITE]: [{role: "editor"}],
                [ACCESS_READ]: [{role: "reader"}],
                constraints: ["!isSystemTiddler", "!isPersonalTiddler"]
            };
        case GLOBAL_SYSTEM_BAG:
            return Object.assign({}, adminOnlyPolicy, {
                [ACCESS_READ]: [{role: "reader"}],
                constraints: ["isSystemTiddler", "!isPersonalTiddler"]
            });
        default:
            return adminOnlyPolicy;
    }
};

const verifyTiddlerConstraints = (constraints, tiddler) => constraints.map(getConstraintChecker).every(c => c(tiddler));

const verifyUserAuthorized = (acl, role, user) => {
    const permittedByRole = rule => rule.hasOwnProperty("role") && ROLES.hasOwnProperty(rule.role) && ROLES[rule.role] <= role;
    const permittedByUserId = rule => rule.hasOwnProperty("userId") && rule.userId === user.uid;
    const permittedByEmail = rule => rule.hasOwnProperty("email") && rule.email === user.email;
    return acl.some(rule => permittedByRole(rule) || permittedByUserId(rule) || permittedByEmail(rule));
};

const hasAccess = async (db, transaction, wiki, bag, role, user, accessType, tiddler=null) => {
    const policy = await readPolicy(db, transaction, wiki, bag, bagPolicyTiddler(bag), defaultPolicy(user, bag));
    const constraintsCheck = (accessType === "write" && tiddler && policy.constraints) ? verifyTiddlerConstraints : () => true;
    return verifyUserAuthorized(policy[accessType], role, user) && constraintsCheck(policy.constraints, tiddler);
};

const bagsWithAccess = async (db, transaction, wiki, bags, role, user, accessType, tiddler=null) => (await Promise.all(
    bags.map(async bag => [bag, await hasAccess(db, transaction, wiki, bag, role, user, accessType, tiddler)])))
        .filter(([_bag, hasAccess]) => hasAccess)
        .map(([bag, _hasAccess]) => bag);

const assertHasAccess = async (db, transaction, wiki, bag, role, user, accessType, tiddler) => {
    if (!(await hasAccess(db, transaction, wiki, bag, role, user, accessType, tiddler))) {
        throw new HTTPError(`no ${accessType} access granted to ${username(user)} with role ${role} on wiki ${wiki} bag ${bag} ${tiddler ? " tiddler " + JSON.stringify(tiddler) : ""}`, HTTP_FORBIDDEN);
    }
}

module.exports = { assertHasAccess, personalBag, hasAccess, bagsWithAccess};
