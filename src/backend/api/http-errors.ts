import * as express from "express";
import {
  TW5FirebaseError,
  TW5FirebaseErrorCode,
} from "../../shared/model/errors";
import { Logger } from "../../shared/util/logger";

export const HTTP_INTERNAL_ERROR = 500;
export const HTTP_BAD_REQUEST = 400;
export const HTTP_FORBIDDEN = 403;
export const HTTP_NOT_FOUND = 404;
export const HTTP_CONFLICT = 409;

const errorCodeToStatusCode = (errorCode: TW5FirebaseErrorCode): number => {
  switch (errorCode) {
    case TW5FirebaseErrorCode.READ_ACCESS_DENIED_TO_BAG:
      return HTTP_FORBIDDEN;
    case TW5FirebaseErrorCode.WRITE_ACCESS_DENIED_TO_BAG:
      return HTTP_FORBIDDEN;
    case TW5FirebaseErrorCode.NO_WRITABLE_BAG_IN_RECIPE:
      return HTTP_FORBIDDEN;
    case TW5FirebaseErrorCode.TIDDLER_NOT_FOUND:
      return HTTP_NOT_FOUND;
    case TW5FirebaseErrorCode.RECIPE_NOT_FOUND:
      return HTTP_NOT_FOUND;
    case TW5FirebaseErrorCode.UNKNOWN_WRITE_ERROR:
      return HTTP_INTERNAL_ERROR;
    case TW5FirebaseErrorCode.REVISION_CONFLICT:
      return HTTP_CONFLICT;
    case TW5FirebaseErrorCode.UPDATE_MISSING_TIDDLER:
      return HTTP_NOT_FOUND;
    case TW5FirebaseErrorCode.CREATE_EXISTING_TIDDLER:
      return HTTP_BAD_REQUEST;
    default:
      return HTTP_INTERNAL_ERROR;
  }
};

export const sendErr = (err: Error, logger: Logger, res: express.Response) => {
  logger.error(err.message, err.stack);
  let responseData = {
    message: err.message,
    stack: err.stack,
  };
  let statusCode = HTTP_INTERNAL_ERROR;
  if (err instanceof TW5FirebaseError) {
    statusCode = errorCodeToStatusCode(err.errorCode);
    Object.assign(responseData, {errorCode: err.errorCode}, err.data);
  }
  return res.status(statusCode).json(responseData);
};