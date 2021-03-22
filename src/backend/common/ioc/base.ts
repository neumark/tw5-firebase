import { ContainerModule, interfaces } from "inversify";
import { TiddlerValidatorFactory } from "../persistence/tiddler-validator-factory";
import { TiddlerFactory } from "../tiddler-factory";
import { Component } from "./components";
import { config, Config } from "src/util/config";
import { PolicyChecker } from "src/backend/api/policy-checker";
import { AuthenticatorMiddleware } from "src/backend/api/authentication";
import { RecipeResolver } from "src/backend/api/recipe-resolver";

export const baseComponents = new ContainerModule((bind: interfaces.Bind) => {
    bind<TiddlerValidatorFactory>(Component.TiddlerValidatorFactory).to(TiddlerValidatorFactory);
    bind<TiddlerFactory>(Component.TiddlerFactory).to(TiddlerFactory);
    bind<PolicyChecker>(Component.PolicyChecker).to(PolicyChecker);
    bind<Config>(Component.config).toConstantValue(config);
    bind<AuthenticatorMiddleware>(Component.AuthenticatorMiddleware).to(AuthenticatorMiddleware);
    bind<RecipeResolver>(Component.RecipeResolver).to(RecipeResolver);
  });