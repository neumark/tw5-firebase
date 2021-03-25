// ENTRY POINT FOR FIREBASE FUNCTIONS
import 'reflect-metadata';
import 'source-map-support/register'
import * as functions from 'firebase-functions';
import { productionStartup } from './common/startup';
import { Component } from './common/ioc/components';
import { Config } from '../shared/util/config';
import { APIEndpointFactory } from './api/endpoints';

const container = productionStartup();
const apiEndpointFactory = container.get<APIEndpointFactory>(Component.APIEndpointFactory);

export const wiki = functions.region(container.get<Config>(Component.config).deploy.apiRegion).https.onRequest(apiEndpointFactory.createAPI());
