import * as admin from "firebase-admin";
import { getWikiRoles } from "../backend/api/authentication";
import { JWT_ROLE_CLAIM_PREFIX } from "../constants";
import { ROLE, RoleName } from "../shared/model/roles";
import { User } from "../shared/model/user";
import { Argv, Arguments, CommandModule } from "yargs";
import { GlobalArgs } from "./global-args";
import { Container } from "inversify";
import { ObjectOf } from "../shared/util/useful-types";

const RE_UID = /^[a-zA-Z0-9]+$/;

const customClaimKey = (wiki: string) => `${JWT_ROLE_CLAIM_PREFIX}${wiki}`;

const getUser = async (uidOrEmail: string): Promise<User> => {
  let firebaseUser;
  if (uidOrEmail.match(RE_UID)) {
    firebaseUser = await admin.auth().getUser(uidOrEmail);
  } else {
    firebaseUser = await admin.auth().getUserByEmail(uidOrEmail);
  }
  return {
    userId: firebaseUser.uid,
    email: firebaseUser.email,
    email_verified: firebaseUser.emailVerified,
    name: firebaseUser.displayName,
    picture: firebaseUser.photoURL,
    roles: getWikiRoles(firebaseUser.customClaims),
  };
};

const updateUserRoles = (wiki: string, user: User, newRole?: ROLE): User => {
  if (newRole === undefined) {
    delete user.roles[wiki];
  } else {
    user.roles[wiki] = newRole;
  }
  return user;
};

type CustomClaims = { [key: string]: ROLE };

const saveUserRoles = async (user: User) => {
  const customClaims = Object.entries(user.roles).reduce(
    (acc: CustomClaims, [wiki, role]: [string, ROLE]) => {
      // add '_' prefix to name of wiki to avoid clash with reserved claims
      acc[customClaimKey(wiki)] = role;
      return acc;
    },
    {} as CustomClaims
  );
  return await admin.auth().setCustomUserClaims(user.userId, customClaims);
};

const NONE_ROLE = "none";

export const getCommandModules = (
  container: Container
): ObjectOf<CommandModule> => {
  return {
    setrole: {
      command: "setrole <userid|email> [role]",
      describe: "grant a role to a user",
      builder: (argv: Argv) =>
        argv
          .positional("userid", {
            describe: "User id or email address",
            type: "string",
          })
          .positional("role", {
            describe: "Role to assign",
            type: "string",
            choices: Object.keys(ROLE).concat(NONE_ROLE),
            default: "admin",
          }),
      handler: async (args: Arguments) => {
        const wiki = args.wiki as string;
        const newRole: ROLE | undefined =
          args.role === NONE_ROLE ? undefined : ROLE[args.role as RoleName];
        const user = await getUser(args.userid as string);
        if ("wiki" in user.roles) {
          console.log(
            `User ${user.email} previously had role ${user.roles[wiki]} on wiki ${wiki}, setting new role to ${newRole}.`
          );
        }
        updateUserRoles(wiki, user, newRole);
        await saveUserRoles(user);
      },
    },
    getuser: {
      command: "getuser <userid|email>",
      describe: "prints information about user",
      builder: (argv: Argv) => {
        return argv.positional("userid", {
          describe: "User id or email address",
          type: "string",
        });
      },
      handler: async (args: Arguments) => await getUser(args.userid as string),
    },
    getrole: {
      command: "getrole <userid|email>",
      describe: "gets the assigned role for a user",
      builder: (argv: Argv) => {
        return argv.positional("userid", {
          describe: "User id or email address",
          type: "string",
        });
      },
      handler: async (args: Arguments) => {
        const user = await getUser(args.userid as string);
        const wiki: string = args.wiki as string;
        const role = user.roles[wiki];
        if (role !== undefined && role > 0) {
          console.log(`User ${user.email} has role ${role} on wiki ${wiki}`);
        } else {
          console.log(
            `User ${user.email} has no explicit role on wiki ${wiki} (in effect, the role is 'authenticated')`
          );
        }
      },
    },
  };
};
