// ENTRY POINT FOR FIREBASE FUNCTIONS

import 'source-map-support/register'
import * as functions from 'firebase-functions';
import { productionStartup } from './common/startup';
import { Component } from './common/ioc/components';
import { getAPI } from './api/endpoints';
import { Config } from 'src/util/config';

const container = productionStartup();
const api = getAPI(container);

export const wiki = functions.region(container.get<Config>(Component.config).deploy.apiRegion).https.onRequest(api);
