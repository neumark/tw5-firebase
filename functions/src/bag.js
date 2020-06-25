const { GLOBAL_CONTENT_BAG, GLOBAL_SYSTEM_BAG, ROLES_TIDDLER } = require('./constants'); 
const { HTTPError, HTTP_FORBIDDEN } = require('./errors');
const { ROLES } = require('./role');
const { isDraftTiddler, isPersonalTiddler, isSystemTiddler } = require('./tw');
const { getContentValidatingReader } = require('./persistence'); 
const { bagPolicySchema } = require('./schema');

const personalBag = email => `user:${email}`;

const applicableBags = email => ([personalBag(email), GLOBAL_SYSTEM_BAG, GLOBAL_CONTENT_BAG]);

// TODO: rewrite hasWriteAccess and hasReadAccess to consult the bag's policy tiddler.
const hasWriteAccess = (role, email, bag) => {
    switch (bag) {
        case personalBag(email):
            return role >= ROLES.reader;
        case GLOBAL_CONTENT_BAG:
            return role >= ROLES.editor;
        case GLOBAL_SYSTEM_BAG:
            return role >= ROLES.admin;
        default:
            return false;
    };
}

const hasReadAccess = (role, email, bag) => (role >= ROLES.reader) && applicableBags(email).includes(bag);

const readPolicy = getContentValidatingReader(bagPolicySchema);

const bagPolicyTiddler = bag => `${bag}/policy`;

const adminOnlyPolicy = {
    write: [{role: "admin"}],
    read: [{role: "admin"}],
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
            write: [{user}],
            read: [{user}],
        };
    }
    switch (bag) {
        case GLOBAL_CONTENT_BAG:
            return Object.assign({
                constraints: ["!isSystemTiddler", "!isDraft"]
            }, adminOnlyPolicy);
        case GLOBAL_SYSTEM_BAG:
            return Object.assign({
                constraints: ["isSystemTiddler", "!isDraft"]
            }, adminOnlyPolicy);
        default: adminOnlyPolicy;
    };
};

const hasAccess = async (transaction, wiki, bag, role, user, accessType) => {
    if (user.isAuthenticated) {
        const policy = await readPolicy(transaction, wiki, bag, bagPolicyTiddler(bag), defaultPolicy(bag));
    }
    return ROLES.anonymous;
};

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

const getBagForTiddler = (email, tiddler) => {
    if (isDraftTiddler(tiddler) || isPersonalTiddler(tiddler)) {
        return personalBag(email);
    }
    if (isSystemTiddler(tiddler)) {
        return GLOBAL_SYSTEM_BAG;
    }
    return GLOBAL_CONTENT_BAG;
}

module.exports = { assertWriteAccess, assertReadAccess, personalBag, applicableBags, getBagForTiddler};
