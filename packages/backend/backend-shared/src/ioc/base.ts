import { BackendConfig } from '@tw5-firebase/shared/src/model/config';
import { ContainerModule, interfaces } from 'inversify';
import { backendConfig } from '../config-reader';
import { TiddlerValidatorFactory } from '../persistence/tiddler-validator-factory';
import { TiddlerFactory } from '../tiddler-factory';
import { Component } from './components';

export const baseComponents = new ContainerModule((bind: interfaces.Bind) => {
  bind<TiddlerValidatorFactory>(Component.TiddlerValidatorFactory).to(TiddlerValidatorFactory);
  bind<TiddlerFactory>(Component.TiddlerFactory).to(TiddlerFactory);
  bind<BackendConfig>(Component.BackendConfig).toConstantValue(backendConfig);
});
