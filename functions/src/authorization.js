const { readTiddler } = require('./persistence'); 
const { GLOBAL_CONTENT_BAG, GLOBAL_SYSTEM_BAG, applicableBags} = require('./tw'); 
const { HTTPError, HTTP_FORBIDDEN } = require('./errors');

const ROLES_TIDDLER = "$:/config/firestore-syncadaptor-client/roles";

const ROLES = {
    admin: 3,
    editor: 2,
    reader: 1,
    none: 0
};

const computeRole = (email, usersToRolls) => Math.max(...(Object.entries(usersToRolls).map(([role, users]) => users.includes(email) ? (ROLES[role] || 0) : ROLES.none)));

const getUserRole = async (transaction, wiki, email) => {
    const tiddler = await readTiddler(transaction, wiki, [GLOBAL_SYSTEM_BAG], ROLES_TIDDLER);
    if (tiddler === null) {
        // default is admin role if no roles tiddler found
        return ROLES.admin;
    }
    const usersToRolls = JSON.parse(tiddler.text);
    return computeRole(email, usersToRolls);
};

const hasWriteAccess = (role, email, bag) => !(
    (role < ROLES.reader) ||
    ((role < ROLES.editor) && (bag === GLOBAL_CONTENT_BAG)) ||
    ((role < ROLES.admin) && (bag === GLOBAL_SYSTEM_BAG)) ||
    !applicableBags(email).includes(bag))

const hasReadAccess = (role, email, bag) => (role >= ROLES.reader) && applicableBags(email).includes(bag)

const assertWriteAccess = (role, wiki, email, bag) => {
    if (!hasWriteAccess(role, email, bag)) {
        throw new HTTPError(`no write access granted to ${email} on wiki ${wiki} bag ${bag}`, HTTP_FORBIDDEN);
    }
}

const assertReadAccess = (role, wiki, email, bag) => {
    if (!hasReadAccess(role, email, bag)) {
        throw new HTTPError(`no read access granted to ${email} on wiki ${wiki} bag ${bag}`, HTTP_FORBIDDEN);
    }
}

module.exports = { ROLES, getUserRole, assertWriteAccess, assertReadAccess};
