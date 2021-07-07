import { WikiLocation } from "../../shared/src/model/config";
import firebase from 'firebase';
import {  } from '../tw5/tw5-types';
import { HTTPStoreClient } from "../../shared/src/apiclient/http-store-client";
import { FetchHTTPTransport } from "../frontend-shared/fetch-http-transport";
import { TiddlerVersionManager } from "../tw5/tiddler-version-manager/tvm";
import { wiki } from "../../backend/restapi/src";
import { Container } from "inversify";

const createContainer = (wikiLocation:WikiLocation, user: firebase.User) => {
  const conatiner = new Container();
}

export const startTW5 = (wikiLocation:WikiLocation, user: firebase.User):void => {
  const client = new HTTPStoreClient(
    wikiLocation.wikiName,
    new FetchHTTPTransport(wikiLocation.apiEndpoint, () => user.getIdToken()),
  );
  const tiddlerVersionManager = new TiddlerVersionManager()
  // preload configuration tiddlers
  $tw.preloadTiddlerArray([
    {
      title: '$:/temp/user',
      userId: user.uid,
      picture: user.photoURL,
      name: user.displayName,
      email: user.email,
    },
    {
      title: '$:/temp/wikilocation',
      type: 'application/json',
      text: JSON.stringify(wikiLocation),
    },
  ]);
  // boot tiddlywiki5
  $tw.boot.boot();
}