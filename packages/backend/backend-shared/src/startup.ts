import 'source-map-support/register';
import * as admin from 'firebase-admin';
import { Container } from 'inversify';
import { productionComponents } from './ioc/prod';
import { getContainer } from './ioc/components';

import { baseComponents } from './ioc/base';

export const productionStartup = (appOptions?: admin.AppOptions): Container => {
  const app = admin.initializeApp(appOptions);
  const container = getContainer();
  container.load(baseComponents);
  container.load(productionComponents(app));
  return container;
};
