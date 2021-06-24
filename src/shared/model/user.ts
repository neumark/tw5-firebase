import { ROLE } from './roles';

export type WikiRoles = { [wiki: string]: ROLE };

// Subset of Firebase's admin.auth.DecodedIdToken;
export interface User {
    email?: string;
    email_verified?: boolean;
    phone_number?: string;
    picture?: string;
    userId: string;
    name?: string;
    roles: WikiRoles;
}

export const username = (user: User) => user.name || user.userId;
