export const ROLES = {
  anonymous: 0,
  authenticated: 1,
  reader: 2,
  editor: 3,
  admin: 4
}

export type RoleName = keyof typeof ROLES;
export type RoleNumber = number;
export type UserId = { userId: string } | { email: string };

export type RoleAssignment = {[key in RoleName]?:UserId[]}