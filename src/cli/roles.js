const fs = require('fs');
const { roleNames } = require('../../functions/src/schema');
const { ROLES, NONE_ROLE, getUserRole, setUserRole } = require('../../functions/src/role');

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
                const oldRole = getUserRole(wiki, user.customClaims);
                if (oldRole > 0) {
                    console.log(`User ${user.email} previously had role ${roleNames[oldRole]} on wiki ${wiki}, setting new role to ${role}.`);
                }
                await setUserRole(admin, wiki, user, role);
            }
        },
        getuser: {
            command: 'getuser <userid|email>',
            desc: 'prints information about user',
            builder: yargs => { yargs
                .positional('userid', {
                describe: 'User id or email address',
                type: 'string'});
            },
            handler: async ({userid}) => await getUser(admin, userid)
        },
        getrole: {
            command: 'getrole <userid|email>',
            desc: 'gets the assigned role for a user',
            builder: yargs => { yargs
                .positional('userid', {
                describe: 'User id or email address',
                type: 'string'});
            },
            handler: async ({userid, wiki}) => {
                const user = await getUser(admin, userid);
                const role = getUserRole(wiki, user.customClaims);
                if (role > 0) {
                    console.log(`User ${user.email} has role ${roleNames[role]} on wiki ${wiki}`);
                } else {
                    console.log(`User ${user.email} has no explicit role on wiki ${wiki} (in effect, the role is 'authenticated')`);
                }
            }
        }
    };
};
