import { UserId, RoleName } from "./roles";

export type AccessType = 'read' | 'write'
export type Grantee =  UserId | { role: RoleName };
export type BagPolicy =  { [key in AccessType]: Grantee[] } & {constraints?: string[]};
