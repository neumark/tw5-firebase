import * as express from 'express';
import { sendErr } from './errors';
import { User, WikiRoles } from '../../model/user';
import { ROLE } from '../../model/roles';
import { inject, injectable } from 'inversify';
import { Component } from '../common/ioc/components';
import * as admin from "firebase-admin";

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

const ANONYMOUS_USER:User = {
    userId: '',
    email: undefined,
    email_verified: false,
    name: 'anonymous',
    picture: undefined,
    roles: {}
};

@injectable()
export class AuthenticatorMiddleware {
  private auth: admin.auth.Auth;

  private async getUserFromToken(req:express.Request):Promise<User> {
    // No bearer token means we have an anonymous visitor
    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        return ANONYMOUS_USER;
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
      roles: Object.entries(decodedToken['claims'] as WikiRoles || {}).reduce((acc:WikiRoles, [wiki, role]:[string, ROLE]) => {
        // remove '_' prefix from name of wiki to avoid clash with reserved claims
        acc[wiki.substr(1)] = role;
        return acc;
      }, {} as WikiRoles)
    };
  }

  constructor(
    @inject(Component.FirebaseAuth) auth: admin.auth.Auth
  ) {
    this.auth = auth;
  }

  async authenticate (req:express.Request, res:express.Response, next:express.NextFunction):Promise<void> {
    try {
      req.user = await this.getUserFromToken(req);
      next();
      return;
    } catch (error) {
      sendErr(res, error, 403);
      return;
    }
  }
}

