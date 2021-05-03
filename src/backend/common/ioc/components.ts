import { Container} from 'inversify';

export const enum Component {
  config = "config",
  FirebaseApp = "FirebaseApp",
  FireStoreDB = "FireStoreDB",
  FirebaseAuth = "FirebaseAuth",
  TransactionRunner = "TransactionRunner",
  getTimestamp = "getTimestamp",
  TiddlerFactory = "TiddlerFactory",
  TiddlerValidatorFactory = "TiddlerValidatorFactory",
  TiddlerStoreFactory = "TiddlerStoreFactory",
  PolicyChecker = "PolicyChecker",
  AuthenticatorMiddleware = "AuthenticatorMiddleware",
  APIEndpointFactory = "APIEndpointFactory",
  RecipeResolver = "RecipeResolver",
  Logger = "Logger"
}

export const getContainer = () => {
  return new Container({defaultScope: 'Singleton'});
}