import { GLOBAL_CONTENT_BAG, GLOBAL_SYSTEM_BAG, ROLES_TIDDLER, POLICY_TIDDLER } from './constants';
import { HTTPError, HTTP_FORBIDDEN } from './errors';
import { getConstraintChecker } from './tw';
import { getContentValidatingReader } from './persistence';
import { bagPolicySchema } from '../common/schema';
import { username } from './authentication';
import { User } from './user';
import { BagPolicy, Grantee } from 'src/model/bag-policy';
import { Tiddler } from 'src/model/tiddler';
import { RoleName, ROLES } from 'src/model/roles';

const personalBag = (user:User) => `user:${user.uid}`;

const readPolicy = getContentValidatingReader(bagPolicySchema);

const adminOnlyPolicy:BagPolicy = {
    write: [{role: "admin"}],
    read: [{role: "admin"}],
};

const defaultPolicy = (user:User, bag:string):BagPolicy => {
    switch (bag) {
        case personalBag(user):
            return {
                write: [{userId: user.uid}],
                read: [{userId: user.uid}],
                constraints: ["isPersonalTiddler"]
            };
        case GLOBAL_CONTENT_BAG:
            return {
                write: [{role: "editor"}],
                read: [{role: "reader"}],
                constraints: ["!isSystemTiddler", "!isPersonalTiddler"]
            };
        case GLOBAL_SYSTEM_BAG:
            return {
                write: adminOnlyPolicy.write,
                read: [{role: "reader"}],
                constraints: ["isSystemTiddler", "!isPersonalTiddler"]
            };
        default:
            return adminOnlyPolicy;
    }
};

const verifyTiddlerConstraints = (constraints:string[], tiddler:Tiddler) => constraints.map(getConstraintChecker).every(c => c(tiddler));

const verifyUserAuthorized = (acl:Grantee[], role:RoleName, user:User) => {
    const permittedByRole = rule => rule.hasOwnProperty("role") && ROLES.hasOwnProperty(rule.role) && ROLES[rule.role] <= role;
    const permittedByUserId = rule => rule.hasOwnProperty("userId") && rule.userId === user.uid;
    const permittedByEmail = rule => rule.hasOwnProperty("email") && rule.email === user.email;
    const result = acl.some(rule => permittedByRole(rule) || permittedByUserId(rule) || permittedByEmail(rule));
    return result;
};

const hasAccess = async (db, transaction, wiki, bag, role, user, accessType, tiddler=null) => {
    const policy = await readPolicy(db, transaction, wiki, bag, POLICY_TIDDLER, defaultPolicy(user, bag));
    if (verifyUserAuthorized(policy[accessType], role, user)) {
        if (accessType === "write" && tiddler && policy.constraints) {
            const constraintsOK = verifyTiddlerConstraints(policy.constraints, tiddler);
            return constraintsOK;
        }
        return true;
    }
    return false;
};

const bagsWithAccess = async (db, transaction, wiki, bags, role, user, accessType, tiddler=null) => {
    const requestedBags = await Promise.all(
        bags.map(
            async bag => ({
                bag,
                hasAccess: await hasAccess(db, transaction, wiki, bag, role, user, accessType, tiddler)
            })));
    return requestedBags.filter(({hasAccess}) => hasAccess).map(({bag}) => bag);
}

const assertHasAccess = async (db, transaction, wiki, bag, role, user, accessType, tiddler) => {
    if (!(await hasAccess(db, transaction, wiki, bag, role, user, accessType, tiddler))) {
        throw new HTTPError(`no ${accessType} access granted to ${username(user)} with role ${role} on wiki ${wiki} bag ${bag} ${tiddler ? " tiddler " + JSON.stringify(tiddler) : ""}`, HTTP_FORBIDDEN);
    }
}

module.exports = { assertHasAccess, personalBag, hasAccess, bagsWithAccess};
