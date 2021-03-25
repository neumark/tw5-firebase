import { inject, injectable } from "inversify";
import {
  AccessType,
  BagPolicy,
  defaultCustomBagPolicy,
  getPersonalBagPolicy,
  Grantee,
  isPersonalBag,
  standardPolicies,
} from "../../shared/model/bag-policy";
import { PERSONAL_BAG_PREFIX, POLICY_TIDDLER } from "../../constants";
import { ROLE } from "../../shared/model/roles";
import { TiddlerData } from "../../shared/model/tiddler";
import { User } from "../../shared/model/user";
import { Component } from "../common/ioc/components";
import { StandardTiddlerPersistence } from "../common/persistence/interfaces";
import {
  TiddlerValidator,
  TiddlerValidatorFactory,
} from "../common/persistence/tiddler-validator-factory";
import { bagPolicySchema } from "../common/schema";
import { checkConstraint } from "./tiddler-constraints";

/*
  Permission Checker
  There are two kinds of operations: READ and WRITE
  There are 5 roles as defined in src/model/roles:ROLES

*/

export interface BagPermission {
  bag: string;
  allowed: boolean;
  reason?: string;
  policy: BagPolicy;
}

const granteesInclude = (
  wiki: string,
  grantees: Grantee[],
  user: User
): boolean =>
  grantees.some((grantee) => {
    if ("userId" in grantee) {
      return grantee.userId === user.userId;
    }
    if ("email" in grantee) {
      return grantee.email === user.email;
    }
    const effectiveRole = user.roles[wiki] || ROLE.anonymous;
    if ("role" in grantee) {
      return grantee.role <= effectiveRole;
    }
  });

@injectable()
export class PolicyChecker {
  private policyValidator: TiddlerValidator<BagPolicy>;

  private async checkPolicies(
    persistence: StandardTiddlerPersistence,
    user: User,
    wiki: string,
    bags: string[],
    accessType: AccessType
  ): Promise<BagPermission[]> {
    // The bag policy can come from 3 places:
    // 1) built-in policies for 'content' and 'system'
    // 2) built-in policies for any bag identified as a personal bag
    // 3) a tiddler called 'policy' within the bag
    const bagsWithNonBuiltinPolicies = [];
    const policiesToCheck: { [bag: string]: BagPolicy } = {};
    for (let bag of bags) {
      if (bag in standardPolicies) {
        policiesToCheck[bag] = standardPolicies[bag];
      } else if (isPersonalBag(bag)) {
        policiesToCheck[bag] = getPersonalBagPolicy(
          bag.substr(PERSONAL_BAG_PREFIX.length)
        );
      } else {
        bagsWithNonBuiltinPolicies.push(bag);
      }
    }
    if (bagsWithNonBuiltinPolicies.length > 0) {
      const readPolicies = await this.policyValidator.read(
        persistence,
        bags
          // don't allow standardDefaultPolicies to be overridden
          .filter((bag) => !(bag in standardPolicies))
          .map((bag) => ({
            namespace: { wiki, bag },
            key: POLICY_TIDDLER,
            fallbackValue: defaultCustomBagPolicy,
          }))
      );
      readPolicies.forEach(
        ({ namespace: { bag }, value }) => (policiesToCheck[bag] = value!)
      );
    }
    return Object.entries(policiesToCheck).map(([bag, policy]) => {
      let reason;
      let allowed = true;
      if (!policy) {
        // this shouldn't happen because we should have a fallback policy for any bag
        throw new Error(
          `Unexpected undefined bag policy for wiki ${wiki} bag ${bag}`
        );
      }
      if (!granteesInclude(wiki, policy[accessType], user)) {
        allowed = false;
        reason = `Permission denied for '${accessType}' access on wiki ${wiki} bag ${bag} to user ${
          user.userId
        } with roles ${JSON.stringify(
          user.roles
        )} due to bag policy. Grantee list for ${accessType} access is ${JSON.stringify(
          policy[accessType]
        )}.`;
      }
      return { bag, allowed, reason, policy };
    });
  }

  private checkConstraints(
    bagPermission: BagPermission,
    tiddlerTitle: string,
    tiddlerData: Partial<TiddlerData>
  ): BagPermission {
    const failed = bagPermission.policy.constraints!.filter((constraint) =>
      checkConstraint(constraint, tiddlerTitle, tiddlerData)
    );
    return {
      ...bagPermission,
      allowed: failed.length < 1,
      reason: `Failed policy constraints prevented writing tiddler ${tiddlerTitle} to bag ${
        bagPermission.bag
      }: ${JSON.stringify(failed)}.`,
    };
  }

  constructor(
    @inject(Component.TiddlerValidatorFactory)
    validatorFactory: TiddlerValidatorFactory
  ) {
    this.policyValidator = validatorFactory.getValidator(bagPolicySchema);
  }

  async verifyReadAccess(
    persistence: StandardTiddlerPersistence,
    user: User,
    wiki: string,
    bags: string[]
  ): Promise<BagPermission[]> {
    return this.checkPolicies(persistence, user, wiki, bags, "read");
  }

  async verifyRemoveAccess(
    persistence: StandardTiddlerPersistence,
    user: User,
    wiki: string,
    bags: string[]
  ): Promise<BagPermission[]> {
    return this.checkPolicies(persistence, user, wiki, bags, "write");
  }

  /**
   * Gets first writable bag (if any) and returns any error message encoundered along the way.
   */
  async getWriteableBag(
    persistence: StandardTiddlerPersistence,
    user: User,
    wiki: string,
    bags: string[],
    tiddlerTitle: string,
    tiddlerData: Partial<TiddlerData>
  ): Promise<BagPermission[]> {
    const results: BagPermission[] = [];
    for (let bagPermission of await this.checkPolicies(
      persistence,
      user,
      wiki,
      bags,
      "write"
    )) {
      // if the bag is writable, verify constraints are met
      if (bagPermission.allowed && bagPermission.policy.constraints) {
        bagPermission = this.checkConstraints(
          bagPermission,
          tiddlerTitle,
          tiddlerData
        );
      }
      results.push(bagPermission);
      if (bagPermission.allowed) {
        break;
      }
    }
    return results;
  }
}
