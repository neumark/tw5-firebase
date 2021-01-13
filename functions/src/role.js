const { getContentValidatingReader } = require('./persistence'); 
const { roleNames, rolesSchema } = require('./schema');
const { ROLES_TIDDLER, GLOBAL_SYSTEM_BAG} = require('./constants'); 

const ROLES = {};

for (const [index, element] of roleNames.entries()) {
  ROLES[element] = index;
}

const computeRole = (email, usersToRolls) => Math.max(ROLES.authenticated, ...(Object.entries(usersToRolls).map(([role, users]) => users.includes(email) ? (ROLES[role] || 0) : ROLES.authenticated)));

const roleReader = getContentValidatingReader(rolesSchema);

const readRoles = async (db, transaction, wiki) => await roleReader (db, transaction, wiki, GLOBAL_SYSTEM_BAG, ROLES_TIDDLER);

const getUserRole = async (db, transaction, wiki, user) => {
    if (user.isAuthenticated) {
        const roles = await readRoles(db, transaction, wiki);
        return computeRole(user.email, roles);
    }
    return ROLES.anonymous;
};

module.exports = { ROLES, getUserRole, readRoles };
