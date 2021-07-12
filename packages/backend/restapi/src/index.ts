// ENTRY POINT FOR FIREBASE FUNCTIONS
import 'reflect-metadata';
import 'source-map-support/register';
import * as functions from 'firebase-functions';
import { productionStartup } from '@tw5-firebase/backend-shared/src/startup';
import { Component } from '@tw5-firebase/backend-shared/src/ioc/components';
import { backendConfig } from '@tw5-firebase/backend-shared/src/config-reader';
import { APIEndpointFactory } from './endpoints';
import { DEFAULT_TIMEOUT_SECONDS } from '@tw5-firebase/shared/src/constants';

const container = productionStartup();
const apiEndpointFactory = container.get<APIEndpointFactory>(Component.APIEndpointFactory);

export const wiki = functions
  .region(backendConfig.apiRegion)
  .runWith({
    timeoutSeconds: backendConfig.timeoutSeconds ?? DEFAULT_TIMEOUT_SECONDS,
    ingressSettings: "ALLOW_ALL"
  })
  .https.onRequest(apiEndpointFactory.createAPI());
