const { GLOBAL_CONTENT_BAG, GLOBAL_SYSTEM_BAG, ROLES_TIDDLER, ACCESS_READ, ACCESS_WRITE } = require('./constants'); 
const { HTTPError, HTTP_FORBIDDEN } = require('./errors');
const { ROLES } = require('./role');
const { isDraftTiddler, isPersonalTiddler, isSystemTiddler, getConstraintChecker } = require('./tw');
const { getContentValidatingReader } = require('./persistence'); 
const { bagPolicySchema } = require('./schema');

const personalBag = email => `user:${email}`;

const applicableBags = email => ([personalBag(email), GLOBAL_SYSTEM_BAG, GLOBAL_CONTENT_BAG]);

const readPolicy = getContentValidatingReader(bagPolicySchema);

const bagPolicyTiddler = bag => `${bag}/policy`;

const adminOnlyPolicy = {
    [ACCESS_WRITE]: [{role: "admin"}],
    [ACCESS_READ]: [{role: "admin"}],
};

const personalBagRE = /^user:(.*)$/;

const personalBagOwner = bag => {
    const match = bag.match(personalBagRE);
    return match ? match[1] : null;
}

const defaultPolicy = bag => {
    const user = personalBagOwner(bag);
    if (user) {
        return {
            [ACCESS_WRITE]: [{user}],
            [ACCESS_READ]: [{user}],
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
    };
};

const verifyTiddlerConstraints = (constraints, tiddler) => constraints.map(getConstraintChecker).every(c => c(tiddler));

const verifyUserAuthorized = (acl, role, user) => {
    const permittedByRole = rule => rule.hasOwnProperty("role") && ROLES.hasOwnProperty(rule.role) && ROLES[rule.role] <= role;
    const permittedByUser = rule => rule.hasOwnProperty("user") && rule.user === user.email;
    return acl.some(rule => permittedByRole(rule) || permittedByUser(rule));
};

const hasAccess = async (transaction, wiki, bag, role, user, accessType, tiddler=null) => {
    const policy = await readPolicy(transaction, wiki, bag, bagPolicyTiddler(bag), defaultPolicy(bag));
    const constraintsCheck = (accessType === "write" && tiddler && policy.constraints) ? verifyTiddlerConstraints : () => true;
    return verifyUserAuthorized(policy[accessType], role, user) && constraintsCheck(policy.constraints, tiddler);
};

const bagsWithAccess = async (transaction, wiki, bags, role, user, accessType, tiddler=null) => (await Promise.all(
    bags.map(async bag => [bag, await hasAccess(transaction, wiki, bag, role, user, accessType, tiddler)])))
        .filter(([_bag, hasAccess]) => hasAccess)
        .map(([bag, _hasAccess]) => bag);

const assertHasAccess = async (transaction, wiki, bag, role, user, accessType, tiddler) => {
    if (!(await hasAccess(transaction, wiki, bag, role, user, accessType, tiddler))) {
        throw new HTTPError(`no ${accessType} access granted to ${user.email} with role ${role} on wiki ${wiki} bag ${bag} ${tiddler ? " tiddler " + JSON.stringify(tiddler) : ""}`, HTTP_FORBIDDEN);
    }
}

module.exports = { assertHasAccess, personalBag, applicableBags, hasAccess, bagsWithAccess};
