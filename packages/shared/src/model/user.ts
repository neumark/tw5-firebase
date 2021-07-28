export type UserId = string;

// Subset of Firebase's admin.auth.DecodedIdToken;
export interface User {
  email?: string;
  email_verified?: boolean;
  phone_number?: string;
  picture?: string;
  userId: UserId;
  name?: string;
}

export const username = (user?: User) => user?.name ?? user?.userId ?? 'unknown';
