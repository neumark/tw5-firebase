import { BagApi } from "@tw5-firebase/shared/src/api/bag-api";
import { getRoleByName, ROLE } from "@tw5-firebase/shared/src/model/roles";
import { User } from "@tw5-firebase/shared/src/model/user";
import { BUILTIN_BAG_ETC } from "@tw5-firebase/shared/src/constants";
import { replaceTemplateVars } from "@tw5-firebase/shared/src/util/templates";

const ROLE_TITLE = '/etc/users/:userId'

export const getRole = async (store:BagApi, user?:User):Promise<ROLE> => {
  if (!user) {
    return ROLE.anonymous;
  }
  const [userTiddler] = await store.read(BUILTIN_BAG_ETC, replaceTemplateVars(ROLE_TITLE, {userId: user.userId}));
  const role = userTiddler?.tiddler?.fields?.role;
  if (role === undefined) {
    return ROLE.anonymous;
  }
  return getRoleByName(role) ?? ROLE.anonymous;
}