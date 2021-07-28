import { injectable } from 'inversify';
import {
  AccessType,
  BagPermission,
  BagPolicy,
  getPersonalBagPolicy,
  Grantee,
  isPersonalBag,
  PolicyRejectReason,
  DEFAULT_BAG_POLICIES,
} from '@tw5-firebase/shared/src/model/bag-policy';
import { PERSONAL_BAG_PREFIX } from '@tw5-firebase/shared/src/constants';
import { ROLE } from '@tw5-firebase/shared/src/model/roles';
import { TiddlerData } from '@tw5-firebase/shared/src/model/tiddler';
import { User } from '@tw5-firebase/shared/src/model/user';
//import { KNOWN_BAG_CONSTRAINTS, PERSONAL_BAG_CONSTRAINT } from './tiddler-constraints';

/*
  Policy Checker
  There are two kinds of operations: READ and WRITE
  There are 5 roles as defined in src/model/roles:ROLES

*/

export const granteeMatches = (grantee:Grantee, user:User, role:ROLE) => ('userId' in grantee && grantee.userId === user.userId) || ('role' in grantee && grantee.role <= role);

export const verifyHasAccess = (user: User, role:ROLE, accessType: AccessType, policy: BagPolicy) => policy[accessType].some(grantee => granteeMatches(grantee, user, role));

const granteesInclude = (wiki: string, grantees: Grantee[], user: User): boolean =>
  grantees.some((grantee) => {
    if ('userId' in grantee) {
      return grantee.userId === user.userId;
    }
    // TODO!!!
    const effectiveRole = ROLE.anonymous;
    return grantee.role <= effectiveRole;
  });

@injectable()
export class PolicyChecker {

  private async checkPolicies(
    user: User|undefined,
    wiki: string,
    bags: string[],
    accessType: AccessType,
  ): Promise<BagPermission[]> {
    // The bag policy can come from 3 places:
    // 1) built-in policies for 'content', 'etc' and 'system'
    // 2) built-in policies for any bag identified as a personal bag
    // 3) a tiddler called 'policy' within the bag
    const policiesToCheck: { [bag: string]: BagPolicy } = {};
    for (const bag of bags) {
      if (bag in DEFAULT_BAG_POLICIES) {
        policiesToCheck[bag] = DEFAULT_BAG_POLICIES[bag];
      } else if (isPersonalBag(bag)) {
        policiesToCheck[bag] = getPersonalBagPolicy(bag.substr(PERSONAL_BAG_PREFIX.length));
      } else {
        throw new Error("custom bags not supported yet!")
      }
    }
    return Object.entries(policiesToCheck).map(([bag, policy]) => {
      let reason: undefined | PolicyRejectReason = undefined;
      let allowed = true;
      if (!policy) {
        // this shouldn't happen because we should have a fallback policy for any bag
        throw new Error(`Unexpected undefined bag policy for wiki ${wiki} bag ${bag}`);
      }
      // if no user set, then we're being called as superuser
      if (user && !granteesInclude(wiki, policy[accessType], user)) {
        allowed = false;
        reason = PolicyRejectReason.INSUFFICIENT_PERMISSION;
      }
      return { bag, allowed, reason, policy };
    });
  }

  private checkConstraints(
    bagPermission: BagPermission,
    tiddlerTitle: string,
    tiddlerData: Partial<TiddlerData>,
  ): BagPermission {
    const failed = [];/* TODO bagPermission.policy.constraints!.filter(
      (constraint) => !checkConstraint(constraint, tiddlerTitle, tiddlerData),
    );*/
    const allowed = failed.length < 1;
    return {
      ...bagPermission,
      allowed,
      reason: allowed ? undefined : PolicyRejectReason.CONTRAINTS,
    };
  }

  async verifyReadAccess(
    user: User,
    wiki: string,
    bags: string[],
  ): Promise<BagPermission[]> {
    return this.checkPolicies(user, wiki, bags, 'read');
  }

  async verifyRemoveAccess(
    user: User,
    wiki: string,
    bags: string[],
  ): Promise<BagPermission[]> {
    return this.checkPolicies(user, wiki, bags, 'write');
  }

  /**
   * Gets first writable bag (if any) and returns any error message encoundered along the way.
   */
  async verifyWriteAccess(
    user: User|undefined,
    wiki: string,
    bags: string[],
    tiddlerTitle: string,
    tiddlerData: Partial<TiddlerData>,
  ): Promise<BagPermission[]> {
    const results: BagPermission[] = [];
    for (let bagPermission of await this.checkPolicies(user, wiki, bags, 'write')) {
      // if the bag is writable, verify constraints are met
      if (bagPermission.allowed /* TODO && bagPermission.policy.constraints*/) {
        bagPermission = this.checkConstraints(bagPermission, tiddlerTitle, tiddlerData);
      }
      results.push(bagPermission);
      if (bagPermission.allowed) {
        break;
      }
    }
    return results;
  }
}
