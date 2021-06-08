import 'reflect-metadata';
import {} from 'jasmine';
import * as sinon from 'sinon';
import { Component, getContainer } from '../../../src/backend/common/ioc/components';
import { baseComponents } from '../../../src/backend/common/ioc/base';
import { testComponents, TIMESTAMP } from './test-components';
import { TiddlerStoreFactory } from '../../../src/backend/api/tiddler-store';
import { User, username } from '../../../src/shared/model/user';
import { TiddlerStore } from '../../../src/shared/model/store';

const wiki = "testwiki"

const createTiddlerStore = (user:User) => {
  const container = getContainer();
  container.load(baseComponents);
  container.load(testComponents());
  return container.get<TiddlerStoreFactory>(Component.TiddlerStoreFactory).createTiddlerStore(user, wiki);
}

// Planned tests

// # Bag reads
// Reading an existing tiddler from bag works as expected when user has sufficient permissions.
// Reading an existing tiddler from bag fails as expected when user lacks sufficient permissions.
// Reading single tiddler from bag fails if the tiddler doesn't exist.
// Reading single tiddler from bag fails if the bag doesn't exist.
// Reading all tiddlers from bag works as expected when user has sufficient permissions.
// Reading all tiddlers from bag fails as expected when user lacks sufficient permissions.
// Reading all tiddlers from bag fails if the bag doesn't exist.

// # Bag writes
// Creating a new tiddler in bag works as expected when user has sufficient permissions if tiddler didn't exist before.
// Creating a new tiddler in bag fails as expected when user has sufficient permissions if tiddler did exist before.
// Creating a new tiddler in bag fails as expected when tiddler write disallowed due to tiddler constraint.
// Creating a new tiddler in bag fails as expected when user has insufficient permissions.
// Creating a new tiddler overrides tiddler metadata (author, modify date, etc) sent in request.
// Updating an existing tiddler fails if the expected revision is not the current revision.
// Updating an existing tiddler fails if user lacks permission to write bag.
// Updating an existing tiddler fails if tiddler constraint prevents writing tiddler to bag.
// Updating an existing tiddler fails if tiddler does not yet exist.
// Updating an existing tiddler overrides tiddler metadata.
// Removing a tiddler from bag fails if expected revision does not match current revision.
// Removing a tiddler from bag succeeds if bag doesn't contain tiddler.

// # Recipes
// Attempting to read from nonexisting recipe fails.
// Attempting to create tiddler in  nonexisting recipe fails
// Attempting to read recipe where any of the bags cannot be read by user fails.
// Attempting to write to recipe where none of the bags can be written by user fails.
// When reading all tiddlers from a recipe, all tiddlers from all bags are returned.
// When reading from recipe, name collisions are resolved according to the read bag order of recipe.
// When creating a tiddler in a recipe, the first viable bag is chosen from the write bag order in recipe.

describe('Bag reads', function () {

  const sinonSandbox = sinon.createSandbox();
  let user:User;
  let store:TiddlerStore;

  beforeEach(async () => {
    user =  {
      name: 'Charlie Root',
      userId: 'root',
      roles: {}
    }
    store = createTiddlerStore(user);
    sinonSandbox.spy(store);
  });

  afterEach(async () => {
    sinonSandbox.restore();
  });

  it('Reading an existing tiddler from bag works as expected when user has sufficient permissions.', async () => {
    const bag = 'content';
    const title = 'title';
    const text = 'asdf';
    const newlyCreated = await store.createInBag(bag, title, {text});
    expect(await store.readFromBag(bag, title)).toEqual({
      bag,
      revision: newlyCreated.revision,
      tiddler: {
        title,
        text,
        creator: username(user),
        modifier: username(user),
        created: TIMESTAMP,
        modified: TIMESTAMP
      }
    })
  })
});