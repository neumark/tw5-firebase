export enum TW5FirebaseErrorCode {

    // 0XX: endpoint errors
    INVALID_WIKI=1,
    BAD_REQUEST_PARAMS=2,
    INVALID_REQUEST_BODY=3,
    ATTEMPTED_UPDATE_IN_RECIPE=4,

    // 1XX: tiddler store errors
    READ_ACCESS_DENIED_TO_BAG=101,
    WRITE_ACCESS_DENIED_TO_BAG=102,
    NO_WRITABLE_BAG_IN_RECIPE=103,
    UNREADABLE_BAG_IN_RECIPE=104,
    TIDDLER_NOT_FOUND=105,
    RECIPE_NOT_FOUND=106,

    // 2XX: persistence errors
    //    22X: write errors
    UNKNOWN_WRITE_ERROR=220,
    REVISION_CONFLICT=221,
    UPDATE_MISSING_TIDDLER=222,
    CREATE_EXISTING_TIDDLER=223
}

export class TW5FirebaseError extends Error {
  readonly errorCode: TW5FirebaseErrorCode;
  readonly data?: any;
  constructor(message: string, errorCode:TW5FirebaseErrorCode, data?: any) {
    super(message);
    this.errorCode = errorCode;
    this.data = data;
    // see: typescriptlang.org/docs/handbook/release-notes/typescript-2-2.html
    // tslint:disable-next-line:no-unsafe-any
    Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain
    this.name = TW5FirebaseError.name; // stack traces display correctly now
  }
}