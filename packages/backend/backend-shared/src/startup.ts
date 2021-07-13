import * as admin from 'firebase-admin';
import { Container } from 'inversify';
import 'source-map-support/register';
import { baseComponents } from './ioc/base';
import { getContainer } from './ioc/components';
import { productionComponents } from './ioc/prod';

export const productionStartup = (appOptions?: admin.AppOptions): Container => {
  const app = admin.initializeApp(appOptions);
  const container = getContainer();
  container.load(baseComponents);
  container.load(productionComponents(app));
  return container;
};
