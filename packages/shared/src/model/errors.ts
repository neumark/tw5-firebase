import { ErrorObject } from 'ajv';
import { AccessType, BagPermission } from './bag-policy';
import { Revision } from './revision';
import { PartialTiddlerData } from './tiddler';
import { User } from './user';

export enum TW5FirebaseErrorCode {
  // 0XX: endpoint errors
  INVALID_WIKI = 1,
  BAD_REQUEST_PARAMS = 2,
  INVALID_REQUEST_BODY = 3,
  ATTEMPTED_UPDATE_IN_RECIPE = 4,

  // 1XX: tiddler store errors
  NO_AUTHENTICATED_USER = 101,
  READ_ACCESS_DENIED_TO_BAG = 102,
  WRITE_ACCESS_DENIED_TO_BAG = 103,
  TIDDLER_NOT_FOUND = 106,

  // 2XX: persistence errors
  // 22X: write errors
  UNKNOWN_WRITE_ERROR = 220,
  REVISION_CONFLICT = 221,
  UPDATE_MISSING_TIDDLER = 222,
  CREATE_EXISTING_TIDDLER = 223,
  FIRESTORE_LISTENER_ERROR = 224,

  // 3XX: recipe resolution errors
  RECIPE_NOT_FOUND = 301,
  NO_WRITABLE_BAG_IN_RECIPE = 302,
  RECIPE_MANDATORY_BAG_NO_ACCESS = 303,
}

export const TW5FirebaseErrorToHTTPErrorCode: Partial<Record<TW5FirebaseErrorCode, number>> = {
  // 0XX
  [TW5FirebaseErrorCode.INVALID_WIKI]: 404,
  [TW5FirebaseErrorCode.BAD_REQUEST_PARAMS]: 400,
  [TW5FirebaseErrorCode.INVALID_REQUEST_BODY]: 400,
  [TW5FirebaseErrorCode.ATTEMPTED_UPDATE_IN_RECIPE]: 400,
  // 1XX
  [TW5FirebaseErrorCode.NO_AUTHENTICATED_USER]: 403,
  [TW5FirebaseErrorCode.READ_ACCESS_DENIED_TO_BAG]: 403,
  [TW5FirebaseErrorCode.WRITE_ACCESS_DENIED_TO_BAG]: 403,
  [TW5FirebaseErrorCode.NO_WRITABLE_BAG_IN_RECIPE]: 401,
  [TW5FirebaseErrorCode.RECIPE_MANDATORY_BAG_NO_ACCESS]: 403,
  [TW5FirebaseErrorCode.TIDDLER_NOT_FOUND]: 404,
  [TW5FirebaseErrorCode.RECIPE_NOT_FOUND]: 404,
  // 2XX
  [TW5FirebaseErrorCode.UNKNOWN_WRITE_ERROR]: 500,
  [TW5FirebaseErrorCode.REVISION_CONFLICT]: 409,
  [TW5FirebaseErrorCode.UPDATE_MISSING_TIDDLER]: 404,
  [TW5FirebaseErrorCode.CREATE_EXISTING_TIDDLER]: 409,
};

const TW5FirebaseErrorMessages: Record<TW5FirebaseErrorCode, string> = {
  // 0XX
  [TW5FirebaseErrorCode.INVALID_WIKI]: 'requested wiki not found',
  [TW5FirebaseErrorCode.BAD_REQUEST_PARAMS]: 'invalid request parameters',
  [TW5FirebaseErrorCode.INVALID_REQUEST_BODY]: 'invalid request body',
  [TW5FirebaseErrorCode.ATTEMPTED_UPDATE_IN_RECIPE]: 'tiddlers cannot be updated in recipes, only bags',
  // 1XX
  [TW5FirebaseErrorCode.NO_AUTHENTICATED_USER]: 'no authenticated user detected in auth header',
  [TW5FirebaseErrorCode.READ_ACCESS_DENIED_TO_BAG]: 'read access denied to bag for current user',
  [TW5FirebaseErrorCode.WRITE_ACCESS_DENIED_TO_BAG]: 'write access denied to bag for current user',
  [TW5FirebaseErrorCode.NO_WRITABLE_BAG_IN_RECIPE]:
    'write attempted to recipe which contained no bags to which tiddler could be written',
  [TW5FirebaseErrorCode.RECIPE_MANDATORY_BAG_NO_ACCESS]:
    'requested recipe contains at least one mandatory bag which could not be accessed',
  [TW5FirebaseErrorCode.TIDDLER_NOT_FOUND]: 'requested tiddler not found',
  [TW5FirebaseErrorCode.RECIPE_NOT_FOUND]: 'requested recipe not found',
  // 2XX
  [TW5FirebaseErrorCode.UNKNOWN_WRITE_ERROR]: 'unknown write error',
  [TW5FirebaseErrorCode.REVISION_CONFLICT]: 'revision mismatch',
  [TW5FirebaseErrorCode.UPDATE_MISSING_TIDDLER]: 'tiddler does not exists',
  [TW5FirebaseErrorCode.CREATE_EXISTING_TIDDLER]: 'attempting to create tiddler which already exists in bag',
  [TW5FirebaseErrorCode.FIRESTORE_LISTENER_ERROR]: 'error in firestore listener',
};

export type BagPermissionError = BagPermission & { user?: User };

export interface RecipePermissionError {
  user?: User;
  title?: string;
  permissions: BagPermission[];
}

export type BodyValidationError = ErrorObject<string, Record<string, any>, unknown>;

export type TW5FirebaseErrorPayload =
  // 0XX
  | {
      code: TW5FirebaseErrorCode.INVALID_WIKI;
    }
  | {
      code: TW5FirebaseErrorCode.BAD_REQUEST_PARAMS;
      data: {
        params: { [key: string]: string };
      };
    }
  | {
      code: TW5FirebaseErrorCode.INVALID_REQUEST_BODY;
      data: {
        body: any;
        errors: BodyValidationError[] | null | undefined;
      };
    }
  | {
      code: TW5FirebaseErrorCode.ATTEMPTED_UPDATE_IN_RECIPE;
      data: {
        recipe: string;
      };
    }
  // 1XX
  | {
      code: TW5FirebaseErrorCode.NO_AUTHENTICATED_USER;
    }
  | {
      code: TW5FirebaseErrorCode.READ_ACCESS_DENIED_TO_BAG;
      data: BagPermissionError;
    }
  | {
      code: TW5FirebaseErrorCode.WRITE_ACCESS_DENIED_TO_BAG;
      data: BagPermissionError;
    }
  | {
      code: TW5FirebaseErrorCode.NO_WRITABLE_BAG_IN_RECIPE;
      data: RecipePermissionError & { tiddlerData: PartialTiddlerData };
    }
  | {
      code: TW5FirebaseErrorCode.RECIPE_MANDATORY_BAG_NO_ACCESS;
      data: {
        accessType: AccessType;
        bag: string;
      };
    }
  | {
      code: TW5FirebaseErrorCode.TIDDLER_NOT_FOUND;
      data: {
        title: string;
        bags: string[];
      };
    }
  | {
      code: TW5FirebaseErrorCode.RECIPE_NOT_FOUND;
      data: {
        recipe: string;
      };
    }
  // 2XX
  | {
      code: TW5FirebaseErrorCode.UNKNOWN_WRITE_ERROR;
      data: {
        message: string;
        stack?: string;
      };
    }
  | {
      code: TW5FirebaseErrorCode.UPDATE_MISSING_TIDDLER;
      data: {
        bag: string;
        title: string;
      };
    }
  | {
      code: TW5FirebaseErrorCode.REVISION_CONFLICT;
      data: {
        updateExpected: Revision;
        foundInDatabase: Revision;
      };
    }
  | {
      code: TW5FirebaseErrorCode.CREATE_EXISTING_TIDDLER;
      data: {
        title: string;
      };
    }
  | {
      code: TW5FirebaseErrorCode.FIRESTORE_LISTENER_ERROR;
      data: string;
    };

export class TW5FirebaseError extends Error {
  constructor(public readonly payload: TW5FirebaseErrorPayload) {
    super(TW5FirebaseErrorMessages[payload.code]);
    // see: typescriptlang.org/docs/handbook/release-notes/typescript-2-2.html
    // tslint:disable-next-line:no-unsafe-any
    Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain
    this.name = TW5FirebaseError.name; // stack traces display correctly now
  }
}
