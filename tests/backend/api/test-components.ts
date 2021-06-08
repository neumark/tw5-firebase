import { ContainerModule, interfaces } from "inversify";
import { Component } from "../../../src/backend/common/ioc/components";
import { TransactionRunner } from "../../../src/backend/common/persistence/interfaces";
import { Logger } from "../../../src/shared/util/logger";
import { getTimestamp } from "../../../src/shared/util/time";
import { MapPersistance } from "./map-persistence";

export const TIMESTAMP = new Date(1620624466294);

export const testComponents = () => {
  const persistence = new MapPersistance();
  return new ContainerModule((bind: interfaces.Bind) => {
    // Persistence related
    bind<TransactionRunner>(Component.TransactionRunner).toConstantValue(persistence);
    // utilities
    bind<typeof getTimestamp>(Component.getTimestamp).toFunction(() => TIMESTAMP);
    bind<Logger>(Component.Logger).toConstantValue(console);
  });
};
