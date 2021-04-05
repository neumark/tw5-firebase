import { ContainerModule, interfaces } from "inversify";
import { AuthenticatorMiddleware } from "../../../backend/api/authentication";
import { APIEndpointFactory } from "../../../backend/api/endpoints";
import { PolicyChecker } from "../../../backend/api/policy-checker";
import { RecipeResolver } from "../../../backend/api/recipe-resolver";
import { BoundTiddlerStoreFactory, injectableBoundTiddlerStoreFactory, GlobalTiddlerStore } from "../../../backend/api/tiddler-store";
import { config, Config } from "../../../shared/util/config";
import { TiddlerValidatorFactory } from "../persistence/tiddler-validator-factory";
import { TiddlerFactory } from "../tiddler-factory";
import { Component } from "./components";

export const baseComponents = new ContainerModule((bind: interfaces.Bind) => {
    bind<TiddlerValidatorFactory>(Component.TiddlerValidatorFactory).to(TiddlerValidatorFactory);
    bind<TiddlerFactory>(Component.TiddlerFactory).to(TiddlerFactory);
    bind<PolicyChecker>(Component.PolicyChecker).to(PolicyChecker);
    bind<Config>(Component.config).toConstantValue(config);
    bind<AuthenticatorMiddleware>(Component.AuthenticatorMiddleware).to(AuthenticatorMiddleware);
    bind<RecipeResolver>(Component.RecipeResolver).to(RecipeResolver);
    bind<GlobalTiddlerStore>(Component.GlobalTiddlerStore).to(GlobalTiddlerStore);
    bind<BoundTiddlerStoreFactory>(Component.BoundTiddlerStoreFactory).toFactory(injectableBoundTiddlerStoreFactory);
    bind<APIEndpointFactory>(Component.APIEndpointFactory).to(APIEndpointFactory);
  });