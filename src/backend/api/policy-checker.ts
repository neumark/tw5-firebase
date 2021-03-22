import {
  PERSONAL_BAG_PREFIX,
  POLICY_TIDDLER,
} from "../../constants";
import { bagPolicySchema } from "../common/schema";
import { User } from "../../model/user";
import { AccessType, BagPolicy, defaultCustomBagPolicy, getPersonalBagPolicy, Grantee, isPersonalBag, standardPolicies } from "src/model/bag-policy";
import { Tiddler } from "../../model/tiddler";
import { ROLE } from "../../model/roles";
import { inject, injectable } from "inversify";
import { Component } from "../common/ioc/components";
import {
  TiddlerValidator,
  TiddlerValidatorFactory,
} from "../common/persistence/tiddler-validator-factory";
import { StandardTiddlerPersistence } from "../common/persistence/interfaces";
import { checkConstraint } from "./tiddler-constraints";

/*
  Permission Checker
  There are two kinds of operations: READ and WRITE
  There are 5 roles as defined in src/model/roles:ROLES

*/

const granteesInclude = (wiki:string, grantees:Grantee[], user: User):boolean => grantees.some(grantee => {
  if ('userId' in grantee) {
    return grantee.userId === user.userId;
  }
  if ('email' in grantee) {
    return grantee.email === user.email;
  }
  const effectiveRole = user.roles[wiki] || ROLE.anonymous;
  if ('role' in grantee) {
    grantee.role <= effectiveRole
  }
});

const getFailedConstraints = (constraints: string[], tiddler: Tiddler):string[] => constraints.filter(
  constraint => checkConstraint(constraint, tiddler)
);


@injectable()
export class PolicyChecker {
  private policyValidator: TiddlerValidator<BagPolicy>;

  constructor(
    @inject(Component.TiddlerValidatorFactory) validatorFactory: TiddlerValidatorFactory
  ) {
    this.policyValidator = validatorFactory.getValidator(bagPolicySchema);
  }

  async checkPermission(
    user: User,
    wiki: string,
    accessType: AccessType,
    bags: string[],
    persistence: StandardTiddlerPersistence,
    tiddler?:Tiddler
  ): Promise<Array<{bag: string, allowed: boolean, reason?: string}>> {
    // The bag policy can come from 3 places:
    // 1) built-in policies for 'content' and 'system'
    // 2) built-in policies for any bag identified as a personal bag
    // 3) a tiddler called 'policy' within the bag
    const bagsWithNonBuiltinPolicies = []
    const policiesToCheck:{[bag:string]:BagPolicy} = {};
    for (let bag of bags) {
      if (bag in standardPolicies) {
        policiesToCheck[bag] = standardPolicies[bag];
      } else if (isPersonalBag(bag)) {
        policiesToCheck[bag] = getPersonalBagPolicy(bag.substr(PERSONAL_BAG_PREFIX.length));
      } else {
        bagsWithNonBuiltinPolicies.push(bag);
      }
    }
    if (bagsWithNonBuiltinPolicies.length > 0) {
      const readPolicies = await this.policyValidator.read(persistence,
        bags
        // don't allow standardDefaultPolicies to be overridden
        .filter(bag => !(bag in standardPolicies))
        .map(bag => ({
          namespace: {wiki, bag},
          key: POLICY_TIDDLER,
          fallbackValue: defaultCustomBagPolicy
        })));
      readPolicies.forEach(({namespace: {bag}, value}) => policiesToCheck[bag] = value!);
    }
    return Object.entries(policiesToCheck).map(([bag, policy]) => {
      let reason;
      let allowed = false;
      if (!policy) {
        // this shouldn't happen because we should have a fallback policy for any bag
        throw new Error(`Unexpected undefined bag policy for wiki ${wiki} bag ${bag}`);
      }
      if (!granteesInclude(wiki, policy[accessType], user)) {
        allowed = false;
        reason = `Permission denied for '${accessType}' access on wiki ${wiki} bag ${bag} to user ${user.userId} with roles ${JSON.stringify(user.roles)} due to bag policy. Grantee list for ${accessType} access is ${JSON.stringify(policy[accessType])}.`
      }
      if (accessType === 'write') {
        if (!tiddler) {
          throw new Error('checkPermission requires tiddler argument to be passed for "write" checks');
        }
        if (allowed && policy.constraints) {
          const failed = getFailedConstraints(policy.constraints, tiddler);
          if (failed.length > 0) {
            allowed = false;
            reason = `Bag policy permission would permit ${accessType} access to user, but the following constraints failed for tiddler ${tiddler?.title} : ${JSON.stringify(failed)}.`;
          }
        }
      }
      return {bag, allowed, reason};
    })
  }
}