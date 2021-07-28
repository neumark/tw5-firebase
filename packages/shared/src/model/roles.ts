export enum ROLE {
  anonymous = 0,
  authenticated = 1,
  reader = 2,
  editor = 3,
  admin = 4,
}

export type RoleName = keyof typeof ROLE;

export const getRoleByName = (roleName:string):ROLE|undefined => {
  if (roleName in ROLE) {
    return ROLE[roleName as RoleName];
  }
  return undefined;
}

export const getRoleName = (role:ROLE):RoleName => Object.entries(ROLE).filter(([_k, v]) => (v as ROLE) === role)[0][0] as RoleName;