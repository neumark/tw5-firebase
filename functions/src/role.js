const { roleNames } = require('./schema');
const { ROLES_TIDDLER, GLOBAL_SYSTEM_BAG} = require('./constants'); 
const NONE_ROLE = "none";
const ROLES = {};

// '_' prefix to claim servers to distinguish from standard JWT fields
const customClaimKey = wiki => `_${wiki}`;

for (const [index, element] of roleNames.entries()) {
  ROLES[element] = index;
}

const getUserRole = (wiki, claims) => {
    const key = customClaimKey(wiki);
    if (!claims || !claims.hasOwnProperty(key)) {
        return ROLES.anonymous;
    }
    return claims[key];
};

const setUserRole = async (admin, wiki, user, newRole) => {
    const key = customClaimKey(wiki);
    const newClaims = Object.assign({}, user.customClaims);
    if (newRole === NONE_ROLE) {
        delete newClaims[key];
    } else {
        newClaims[key] = ROLES[newRole];
    }
    return await admin.auth().setCustomUserClaims(user.uid, newClaims);
};

module.exports = { ROLES, NONE_ROLE, getUserRole, setUserRole };
