const { readTiddler, readBags, writeTiddler, removeTiddler } = require('./persistence');
const { bagsWithAccess, hasAccess} = require('./bag');
const { resolveRecipe } = require('./recipe');
const { HTTPError, HTTP_FORBIDDEN, HTTP_BAD_REQUEST, sendErr } = require('./errors');
const { getUserRole, ROLES } = require('./role');
const { validateTiddler } = require('./schema');
const { ACCESS_READ, ACCESS_WRITE } = require('./constants');

const requireAuthorizedUser = req => {
    if (!req.user || !req.user.isAuthenticated) {
        throw new HTTPError('Unauthorized', 403);
    }
};

const mkRead = db => (req, res) => {
  // not prepared for anonymous users yet
  requireAuthorizedUser(req);
  const email = req.user.email;
  const wiki = req.params.wiki;
  const title = req.params.title;
  return db.runTransaction(async transaction => {
      // when reading a recipe, user must have access to all bags (regardless of which bag contains requested tiddler).
      const bags = await (!!req.params.bag ? [req.params.bag] : resolveRecipe(db, transaction, wiki, req.params.recipe, req.user));
      const role = await getUserRole(db, transaction, wiki, req.user);
      if (bags.length === 0 || (await bagsWithAccess(db, transaction, wiki, bags, role, req.user, ACCESS_READ)).length < bags.length) {
        throw new HTTPError(`no ${ACCESS_READ} access granted to ${req.user.email} with role ${role} on wiki ${wiki} ${!!req.params.recipe ? "recipe " + req.params.recipe : "bag " + req.params.bag}${title? " tiddler " + JSON.stringify(title) : ""}`, HTTP_FORBIDDEN);
      }
      return title ? readTiddler(db, transaction, wiki, bags, title) : readBags(db, transaction, wiki, bags); 
  }).then(
      res.json.bind(res),
      err => sendErr(res, err));
};

const mkWrite = db => (req, res) => {
  // not prepared for anonymous users yet
  requireAuthorizedUser(req);
  // TODOs:
  // * support moving tiddlers between bags (write to different bag than which it came from).
  const user = req.user;
  const wiki = req.params.wiki;
  const revision = req.query.revision;
  const tiddler = Object.assign({}, req.body, {revision});
  const email = req.user.email;
  if (tiddler.title !== req.params.title) {
    throw new HTTPError(`mismatch between tiddler titles in URL and PUT body`, HTTP_BAD_REQUEST);
  }
  const validation = validateTiddler(tiddler);
  if (!validation.valid) {
    throw new HTTPError(`tiddler does not conform to schema: ${JSON.stringify(validation.errors)}`, HTTP_BAD_REQUEST);
  }
  if (req.params.bag && tiddler.bag && req.params.bag !== tiddler.bag) {
    throw new HTTPError(`tiddler's bag attributes (${tiddler.bag}) and bag name in URL (${req.params.bag}) do not match`, HTTP_BAD_REQUEST);
  }
  return db.runTransaction(async transaction => {
      const bags = await (!!req.params.bag ? [req.params.bag] : resolveRecipe(db, transaction, wiki, req.params.recipe, user));
      const role = await getUserRole(db, transaction, wiki, user);
      const acceptingBags = await bagsWithAccess(db, transaction, wiki, bags, role, user, ACCESS_WRITE, tiddler);
      if (acceptingBags.length < 1) {
        throw new HTTPError(`no ${ACCESS_WRITE} access granted to ${user.email} with role ${role} on wiki ${wiki} ${!!req.params.recipe ? "recipe " + req.params.recipe : "bag " + req.params.bag} ${tiddler ? "tiddler " + JSON.stringify(tiddler) : ""}`, HTTP_FORBIDDEN);
      }
      const destinationBag = acceptingBags[0];
      const updatedTiddler = await writeTiddler(db, transaction, email, wiki, destinationBag, tiddler);
      return {bag: destinationBag, revision: updatedTiddler.revision};
  }).then(
      res.json.bind(res),
      err => sendErr(res, err));
};

const mkRemove = db => (req, res) => {
    // not prepared for anonymous users yet
    requireAuthorizedUser(req);
    const email = req.user.email;
    const wiki = req.params.wiki;
    const bag = req.params.bag;
    const title = req.params.title;
    const revision = req.query.revision;
    return db.runTransaction(async transaction => {
            const role = await getUserRole(db, transaction, wiki, req.user);
            if (!(await hasAccess(db, transaction, wiki, bag, role, req.user, ACCESS_WRITE))) {
                throw new HTTPError(`No ${ACCESS_WRITE} access granted for remove operation to ${user.email} with role ${role} on wiki ${wiki} bag ${bag} tiddler ${title}`, HTTP_FORBIDDEN);
            }
            await removeTiddler(db, transaction, wiki, bag, title, revision);
            return {};
    }).then(
        res.json.bind(res),
        err => sendErr(res, err));
};

const getEndpoints = db => {
    return {
        read: mkRead(db),
        write: mkWrite(db),
        remove: mkRemove(db)
    };
};

module.exports = { getEndpoints };
