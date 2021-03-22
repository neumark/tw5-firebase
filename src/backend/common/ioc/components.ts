import 'reflect-metadata';
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
  PolicyChecker = "PolicyChecker",
  AuthenticatorMiddleware = "AuthenticatorMiddleware",
  RecipeResolver = "RecipeResolver"
}

export const getContainer = () => {
  return new Container();
}