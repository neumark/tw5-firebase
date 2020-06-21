const { sendErr } = require('./errors');

// Express middleware that validates Firebase ID Tokens passed in the Authorization HTTP header.
// The Firebase ID token needs to be passed as a Bearer token in the Authorization HTTP header like this:
// `Authorization: Bearer <Firebase ID Token>`.
// when decoded successfully, the ID Token content will be added as `req.user`.
const ANONYMOUS_VISITOR = {
    uid: 0,
    email: null,
    isAuthenticated: false
}

const getUserFromToken = async (admin, req) => {
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

const validateFirebaseIdToken = admin => async (req, res, next) => {

  // Read the ID Token from the Authorization header.
  const idToken = req.headers.authorization.split('Bearer ')[1];

  try {
    req.user = await getUserFromToken(admin, req);
    next();
    return;
  } catch (error) {
    sendErr(res, error, 403);
    return;
  }
};

module.exports = { validateFirebaseIdToken };
