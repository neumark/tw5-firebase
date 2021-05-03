import { ContainerModule, interfaces } from "inversify";
import { AuthenticatorMiddleware } from "../../../backend/api/authentication";
import { APIEndpointFactory } from "../../../backend/api/endpoints";
import { PolicyChecker } from "../../../backend/api/policy-checker";
import { RecipeResolver } from "../../../backend/api/recipe-resolver";
import { TiddlerStoreFactory } from "../../../backend/api/tiddler-store";
import { config } from "../../../shared/util/config";
import { Config } from "../../../shared/model/config";
import { TiddlerValidatorFactory } from "../persistence/tiddler-validator-factory";
import { TiddlerFactory } from "../tiddler-factory";
import { Component } from "./components";

export const baseComponents = new ContainerModule((bind: interfaces.Bind) => {
  bind<TiddlerValidatorFactory>(Component.TiddlerValidatorFactory).to(
    TiddlerValidatorFactory
  );
  bind<TiddlerFactory>(Component.TiddlerFactory).to(TiddlerFactory);
  bind<PolicyChecker>(Component.PolicyChecker).to(PolicyChecker);
  bind<Config>(Component.config).toConstantValue(config);
  bind<AuthenticatorMiddleware>(Component.AuthenticatorMiddleware).to(
    AuthenticatorMiddleware
  );
  bind<RecipeResolver>(Component.RecipeResolver).to(RecipeResolver);
  bind<TiddlerStoreFactory>(Component.TiddlerStoreFactory).to(
    TiddlerStoreFactory
  );
  bind<APIEndpointFactory>(Component.APIEndpointFactory).to(APIEndpointFactory);
});
