import * as admin from "firebase-admin";
import { ContainerModule, interfaces } from "inversify";
import { FirestoreTransactionRunner } from "../persistence/firestore-persistence";
import { TransactionRunner } from "../persistence/interfaces";
import { Component } from "./components";
import { getTimestamp } from "../../../util/time";

export const productionComponents = (app: admin.app.App) =>
  new ContainerModule((bind: interfaces.Bind) => {
    // Firebase-specific values
    bind<admin.app.App>(Component.FirebaseApp).toConstantValue(app);
    bind<FirebaseFirestore.Firestore>(Component.FireStoreDB).toConstantValue(
      app.firestore()
    );
    bind<admin.auth.Auth>(Component.FirebaseAuth).toConstantValue(app.auth());
    // Persistence related
    bind<TransactionRunner>(Component.TransactionRunner).to(
      FirestoreTransactionRunner
    );
    // utilities
    bind<typeof getTimestamp>(Component.getTimestamp).toFunction(getTimestamp);
  });
