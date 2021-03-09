import * as admin from 'firebase-admin';
import * as express from 'express';
import { User } from './user';
const { sendErr } = require('./errors');

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


const ANONYMOUS_VISITOR = {
    uid: '-anonymous-',
    email: null,
    email_verified: false,
    name: null,
    picture: null,
    isAuthenticated: false
} as any as User;

const getUserFromToken = async (auth:(typeof admin.auth), req:express.Request) => {
  // No bearer token means we have an anonymous visitor
  if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
      return ANONYMOUS_VISITOR;
  }

  // Read the ID Token from the Authorization header.
  const idToken = req.headers.authorization.split('Bearer ')[1];
  const user = await admin.auth().verifyIdToken(idToken);
  user.isAuthenticated = true;
  return user;
}

export const validateFirebaseIdToken = (auth:(typeof admin.auth)) => async (req:express.Request, res:express.Response, next:express.NextFunction) => {

  // Read the ID Token from the Authorization header.
  const idToken = req?.headers?.authorization?.split('Bearer ')[1];

  try {
    req.user = await getUserFromToken(auth, req);
    next();
    return;
  } catch (error) {
    sendErr(res, error, 403);
    return;
  }
};

export const username = (user:admin.auth.DecodedIdToken) => user.name || user.uid;
