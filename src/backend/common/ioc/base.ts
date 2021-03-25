import { ContainerModule, interfaces } from "inversify";
import { TiddlerValidatorFactory } from "../persistence/tiddler-validator-factory";
import { TiddlerFactory } from "../tiddler-factory";
import { Component } from "./components";
import { config, Config } from "../../../shared/util/config";
import { PolicyChecker } from "../../../backend/api/policy-checker";
import { AuthenticatorMiddleware } from "../../../backend/api/authentication";
import { RecipeResolver } from "../../../backend/api/recipe-resolver";
import { TiddlerStore } from "../../../backend/api/tiddler-store";
import { APIEndpointFactory } from "../../../backend/api/endpoints";

export const baseComponents = new ContainerModule((bind: interfaces.Bind) => {
    bind<TiddlerValidatorFactory>(Component.TiddlerValidatorFactory).to(TiddlerValidatorFactory);
    bind<TiddlerFactory>(Component.TiddlerFactory).to(TiddlerFactory);
    bind<PolicyChecker>(Component.PolicyChecker).to(PolicyChecker);
    bind<Config>(Component.config).toConstantValue(config);
    bind<AuthenticatorMiddleware>(Component.AuthenticatorMiddleware).to(AuthenticatorMiddleware);
    bind<RecipeResolver>(Component.RecipeResolver).to(RecipeResolver);
    bind<TiddlerStore>(Component.TiddlerStore).to(TiddlerStore);
    bind<APIEndpointFactory>(Component.APIEndpointFactory).to(APIEndpointFactory);
  });