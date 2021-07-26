import * as express from 'express';
import * as admin from 'firebase-admin';
import { inject, injectable } from 'inversify';
import { User} from '@tw5-firebase/shared/src/model/user';
import { Component } from '@tw5-firebase/backend-shared/src/ioc/components';
import {} from './express-types';

// Express middleware that validates Firebase ID Tokens passed in the Authorization HTTP header.
// The Firebase ID token needs to be passed as a Bearer token in the Authorization HTTP header like this:
// `Authorization: Bearer <Firebase ID Token>`.
// when decoded successfully, the ID Token content will be added as `req.user`.

/*
 *
 * User fields:
 {
    "name": "Foo Bar",
    "picture": "https://lh3.googleusercontent.com/a-/AOh14GjazfRwxtyRgNvFfFljmPGWAZ99gtxFavpANCPUIIc",
    "email": "foo.bar@gmail.com",
    "email_verified": true,
    "uid": "bMLcoJSRrBZBDSgm7DjTnXzO5up1"
    // custom claims declaring roles on different wikis
    "pn-wiki": 4,
 }
 */

@injectable()
export class AuthenticatorMiddleware {
  private auth: admin.auth.Auth;

  private async getUserFromToken(req: express.Request): Promise<User|undefined> {
    // No bearer token means we have an anonymous visitor
    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
      return undefined;
    }

    // Read the ID Token from the Authorization header.
    const idToken = req.headers.authorization.split('Bearer ')[1];
    const decodedToken = await this.auth.verifyIdToken(idToken);
    return {
      userId: decodedToken.uid,
      email: decodedToken.email,
      email_verified: decodedToken.email_verified,
      name: decodedToken['name'],
      picture: decodedToken.picture,
    };
  }

  constructor(@inject(Component.FirebaseAuth) auth: admin.auth.Auth) {
    this.auth = auth;
  }

  async authenticate(req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> {
    req.user = await this.getUserFromToken(req);
    next();
  }
}
