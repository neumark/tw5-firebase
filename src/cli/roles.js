const fs = require('fs');
const { roleNames } = require('../../functions/src/schema');
const { ROLES } = require('../../functions/src/role');

const NONE_ROLE = "none";

const RE_UID = /^[a-zA-Z0-9]+$/;

const getUser = async (admin, uidOrEmail) => {
    if (uidOrEmail.match(RE_UID)) {
        return admin.auth().getUser(uidOrEmail);
    }
    return admin.auth().getUserByEmail(uidOrEmail);
};

module.exports = admin => {
    return {
        setrole: {
            command: 'setrole <userid|email> [role]',
            desc: 'grant a role to a user',
            builder: yargs => { yargs
                .positional('userid', {
                describe: 'User id or email address',
                type: 'string'})
                .positional('role', {
                describe: 'Role to assign',
                type: 'string',
                choices: roleNames.concat(NONE_ROLE),
                default: 'admin'});
            },
            handler: async ({role, userid, wiki}) => {
                const user = await getUser(admin, userid);
                if (user.customClaims && user.customClaims.hasOwnProperty(wiki)) {
                    console.log(`User ${user.email} previously had role ${roleNames[user.customClaims[wiki]]} on wiki ${wiki}, setting new role to ${role}.`);
                }
                const newClaims = Object.assign({}, user.customClaims);
                if (role === NONE_ROLE) {
                    delete newClaims[wiki];
                } else {
                    newClaims[wiki] = ROLES[role];
                }
                await admin.auth().setCustomUserClaims(user.uid,newClaims);
            }
        },
        getrole: {
            command: 'getrole <userid|email>',
            desc: 'gets the assigned role for a user',
            builder: yargs => { yargs
                .positional('userid', {
                describe: 'User id or email address',
                type: 'string'});
            },
            handler: async ({role, userid, wiki}) => {
                const user = await getUser(admin, userid);
                if (user.customClaims && user.customClaims.hasOwnProperty(wiki)) {
                    console.log(`User ${user.email} has role ${roleNames[user.customClaims[wiki]]} on wiki ${wiki}`);
                } else {
                    console.log(`User ${user.email} has no explicit role on wiki ${wiki} (in effect, the role is 'authenticated')`);
                }
                await admin.auth().setCustomUserClaims(user.uid, Object.assign({}, user.customClaims, {[wiki]: ROLES[role]}));
            }
        }
    };
};
