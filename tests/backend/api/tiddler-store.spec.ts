import "reflect-metadata";
import {} from "../../backend-test-base";
import * as sinon from "sinon";
import {
  Component,
  getContainer,
} from "../../../src/backend/common/ioc/components";
import { baseComponents } from "../../../src/backend/common/ioc/base";
import { testComponents, FROZEN_TIMESTAMP } from "./test-components";
import { TiddlerStoreFactory } from "../../../src/backend/api/tiddler-store";
import { User, username } from "../../../src/shared/model/user";
import { TiddlerStore } from "../../../src/shared/model/store";
import { MapPersistance } from "./map-persistence";
import { TiddlerMetadata } from "../../../src/shared/model/tiddler";
import { ROLE } from "../../../src/shared/model/roles";
import {
  DEFAULT_TIDDLER_TYPE,
  JSON_TIDDLER_TYPE,
} from "../../../src/constants";
import {
  TW5FirebaseError,
  TW5FirebaseErrorCode,
  TW5FirebaseErrorPayload,
} from "../../../src/shared/model/errors";
import {
  BagPolicy,
  PolicyRejectReason,
} from "../../../src/shared/model/bag-policy";

const wiki = "testwiki";

const UNPRIVILEGED_USER: User = {
  name: "Charlie Root",
  userId: "root",
  roles: {},
};

const READER_USER: User = {
  ...UNPRIVILEGED_USER,
  roles: { [wiki]: ROLE.reader },
};

const ADMIN_USER: User = {
  ...UNPRIVILEGED_USER,
  roles: { [wiki]: ROLE.admin },
};

const getDefaultTiddlerMetadata: (user: User) => TiddlerMetadata = (user) => ({
  created: FROZEN_TIMESTAMP,
  creator: username(user),
  modified: FROZEN_TIMESTAMP,
  modifier: username(user),
});

const createTiddlerStore = (user: User) => {
  const container = getContainer();
  container.load(baseComponents);
  container.load(testComponents());
  return {
    store: container
      .get<TiddlerStoreFactory>(Component.TiddlerStoreFactory)
      .createTiddlerStore(user, wiki),
    persistence: container.get<MapPersistance>(Component.TransactionRunner),
  };
};

const expectRejectionWithPayload = async <T>(
  p: Promise<T> | (() => Promise<T>),
  expected?: TW5FirebaseErrorPayload
): Promise<void> => {
  let exc: any = undefined;
  try {
    const value = await (typeof p === "function" ? p() : p);
    return fail(
      `should have thrown exception, instead got ${JSON.stringify(
        value,
        null,
        4
      )}`
    );
  } catch (e) {
    exc = e;
  }
  expect(exc).toBeDefined();
  expect(exc).toBeInstanceOf(TW5FirebaseError);
  if (expected) {
    expect(exc.payload).toEqual(expected);
  }
};

const numDocs = (persistance: MapPersistance) => persistance.state.size;

// # Recipes
// Attempting to read from nonexisting recipe fails.
// Attempting to create tiddler in  nonexisting recipe fails
// Attempting to read recipe where any of the bags cannot be read by user fails.
// Attempting to write to recipe where none of the bags can be written by user fails.
// When reading all tiddlers from a recipe, all tiddlers from all bags are returned.
// When reading from recipe, name collisions are resolved according to the read bag order of recipe.
// When creating a tiddler in a recipe, the first viable bag is chosen from the write bag order in recipe.

describe("Bag reads", function () {
  // DONE: Reading an existing tiddler from bag works as expected when user has sufficient permissions.
  // DONE: Reading an existing tiddler from bag fails as expected when user lacks sufficient permissions.
  // Reading single tiddler from bag fails if the tiddler doesn't exist.
  // Reading single tiddler from bag fails if the bag doesn't exist.
  // Reading all tiddlers from bag works as expected when user has sufficient permissions.
  // Reading all tiddlers from bag fails as expected when user lacks sufficient permissions.
  // Reading all tiddlers from bag fails if the bag doesn't exist.

  it("Reading an existing tiddler from bag works as expected when user has sufficient permissions (by role).", async () => {
    const bag = "content";
    const title = "title";
    const text = "asdf";
    const revision = "0";
    const { persistence, store } = createTiddlerStore(READER_USER);
    const sinonSandbox = sinon.createSandbox();
    sinonSandbox.spy(store);
    sinonSandbox.spy(persistence);
    expect(numDocs(persistence)).toEqual(0);
    await persistence.createTiddler(
      { wiki, bag },
      { title, text, ...getDefaultTiddlerMetadata(READER_USER) },
      revision
    );
    expect(numDocs(persistence)).toEqual(1);
    expect(await store.readFromBag(bag, title)).toEqual({
      bag,
      revision,
      tiddler: {
        title,
        text,
        creator: username(READER_USER),
        modifier: username(READER_USER),
        created: FROZEN_TIMESTAMP,
        modified: FROZEN_TIMESTAMP,
      },
    });
  });

  it(`Reading an existing tiddler from bag fails as expected when user lacks sufficient permissions.`, async () => {
    const bag = "content";
    const title = "title";
    const text = "asdf";
    const revision = `${+FROZEN_TIMESTAMP}:${UNPRIVILEGED_USER.userId}`;
    const { persistence, store } = createTiddlerStore(UNPRIVILEGED_USER);
    const sinonSandbox = sinon.createSandbox();
    sinonSandbox.spy(store);
    sinonSandbox.spy(persistence);
    expect(numDocs(persistence)).toEqual(0);
    await persistence.createTiddler(
      { wiki, bag },
      { title, text, ...getDefaultTiddlerMetadata(UNPRIVILEGED_USER) },
      revision
    );
    expect(numDocs(persistence)).toEqual(1);
    await expectRejectionWithPayload(() => store.readFromBag(bag, title), {
      // TODO, should be TW5FirebaseErrorCode.READ_ACCESS_DENIED_TO_BAG
      code: TW5FirebaseErrorCode.READ_ACCESS_DENIED_TO_BAG,
      data: {
        user: UNPRIVILEGED_USER,
        bag: "content",
        allowed: false,
        reason: PolicyRejectReason.INSUFFICIENT_PERMISSION,
        policy: {
          write: [{ role: ROLE.editor }],
          read: [{ role: ROLE.reader }],
          constraints: ["isContentTiddler"],
        },
      },
    });
  });
});

describe("Bag writes", function () {
  // DONE: Creating a new tiddler in bag works as expected when user has sufficient permissions if tiddler didn't exist before.
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

  it("Creating a new tiddler in bag works as expected when user has sufficient permissions (by role) and it doesn't yet exist.", async () => {
    const bag = "content";
    const title = "title";
    const text = "asdf";
    const revision = `${+FROZEN_TIMESTAMP}:${ADMIN_USER.userId}`;
    const { persistence, store } = createTiddlerStore(ADMIN_USER);
    const sinonSandbox = sinon.createSandbox();
    sinonSandbox.spy(store);
    sinonSandbox.spy(persistence);
    expect(numDocs(persistence)).toEqual(0);
    await store.createInBag(bag, title, {
      text,
      type: DEFAULT_TIDDLER_TYPE,
      ...getDefaultTiddlerMetadata(ADMIN_USER),
    });
    expect(numDocs(persistence)).toEqual(1);
    expect(await store.readFromBag(bag, title)).toEqual({
      bag,
      revision,
      tiddler: {
        title,
        text,
        type: DEFAULT_TIDDLER_TYPE,
        fields: {},
        tags: [],
        creator: username(ADMIN_USER),
        modifier: username(ADMIN_USER),
        created: FROZEN_TIMESTAMP,
        modified: FROZEN_TIMESTAMP,
      },
    });
  });
});
