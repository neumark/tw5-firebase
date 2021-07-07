export enum ROLE {
  anonymous = 0,
  authenticated = 1,
  reader = 2,
  editor = 3,
  admin = 4,
}

export type RoleName = keyof typeof ROLE;