const { runTransaction, readTiddler, readBags, writeTiddler, removeTiddler } = require('./persistence');
const { applicableBags, getBagForTiddler } = require('./tw');
const { HTTPError, HTTP_FORBIDDEN, HTTP_BAD_REQUEST, sendErr } = require('./errors');
const { getUserRole, ROLES, assertWriteAccess } = require('./authorization');


const read = (req, res) => {
  const wiki = req.params.wiki;
  const title = req.params.title;
  const email = req.user.email;
  return runTransaction(async transaction => {
      const role = await getUserRole(transaction, wiki, email);
      if (role < ROLES.reader) {
          throw new HTTPError(`no read access is granted to ${email}`, HTTP_FORBIDDEN);
      }
      const bags = applicableBags(email);
      // personal bag overrides global bag
      return title ? readTiddler(transaction, wiki, bags, title) : readBags(transaction, wiki, bags); 
  }).then(
      res.json.bind(res),
      err => sendErr(res, err));
};

const write = (req, res) => {
  // TODOs:
  // * ajv schema for tiddler?
  // * DONE: override username, timestamp for tiddler
  // * DONE: Don't allow save if there is a revision conflict (make saving atomic in transaction).
  // * DONE: compute and return new revision based on tiddler, user
  // * DONE: save per-user tiddlers in the 'peruser' collection (StoryList, drafts) - only latest version.
  // * DONE: return new revision of tiddler.
  const wiki = req.params.wiki;
  const tiddler = req.body;
  const revision = tiddler.revision;
  const email = req.user.email;
  if (tiddler.title !== req.params.title) {
      return sendErr(res, new HTTPError(`mismatch between tiddler titles in URL and PUT body`, HTTP_BAD_REQUEST));
  }
  return runTransaction(async transaction => {
      const role = await getUserRole(transaction, wiki, email);
      const bag = getBagForTiddler(email, tiddler);
      // TODO: check if tiddler has a bag field which differs from value of getBagForTidler()
      assertWriteAccess(role, wiki, email, bag);
      const updatedTiddler = await writeTiddler(transaction, email, wiki, bag, tiddler, revision);
      return {bag, revision: updatedTiddler.revision};
  }).then(
      res.json.bind(res),
      err => sendErr(res, err));
};

const remove = async (req, res) => {
    const email = req.user.email;
    const wiki = req.params.wiki;
    const bag = req.params.bag;
    const title = req.params.title;
    const revision = req.query.revision;
    try {
        await runTransaction(async transaction => {
            const role = await getUserRole(transaction, wiki, email);
            assertWriteAccess(role, wiki, email, bag);
            await removeTiddler(transaction, wiki, bag, title, revision);
        });
        res.status(200).json({});
    } catch (err) {
        sendErr(res, err);
    }
};

module.exports = { read, write, remove };
