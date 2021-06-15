import { BUILTIN_BAG_CONTENT, BUILTIN_BAG_SYSTEM, PERSONAL_BAG_PREFIX } from "../../constants";
import { UserId, ROLE } from "./roles";
import { User } from "./user";

export type AccessType = 'read' | 'write';
export type Grantee =  UserId | { role: ROLE };
export type BagPolicy =  { [key in AccessType]: Grantee[] } & {constraints?: string[]};

export const standardPolicies:{[bag:string]:BagPolicy} = {
  [BUILTIN_BAG_CONTENT]: {
    write: [{ role: ROLE.editor }],
    read: [{ role: ROLE.reader }],
    constraints: ["isContentTiddler"],
  },
  [BUILTIN_BAG_SYSTEM]: {
    write: [{ role: ROLE.admin }],
    read: [{ role: ROLE.anonymous }],
    constraints: ["isSystemTiddler"],
  },
};

export const defaultCustomBagPolicy:BagPolicy = {
  write: [{role: ROLE.admin}],
  read: [{role: ROLE.admin}],
};

export const getPersonalBagPolicy = (userId:string):BagPolicy =>  ({
  write: [{ userId: userId }],
  read: [{ userId: userId }],
  constraints: ["isPersonalTiddler"],
})

export const personalBag = (user: User) => `${PERSONAL_BAG_PREFIX}${user.userId}`;

// TOOD: a regexp would probably be faster...
export const isPersonalBag = (bag:string) => bag.startsWith(PERSONAL_BAG_PREFIX) && bag.length > PERSONAL_BAG_PREFIX.length;

export interface BagPermission {
  bag: string;
  allowed: boolean;
  reason?: string;
  policy: BagPolicy;
}