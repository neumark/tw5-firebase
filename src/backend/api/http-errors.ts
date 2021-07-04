import * as express from 'express';
import { TW5FirebaseError, TW5FirebaseErrorToHTTPErrorCode } from '../../shared/model/errors';
import { Logger } from '../../shared/util/logger';

export const HTTP_INTERNAL_ERROR = 500;

export const sendErr = (err: Error, logger: Logger, res: express.Response) => {
  logger.error(err.message, err.stack);
  const responseData = {
    message: err.message,
    stack: err.stack,
  };
  let statusCode = HTTP_INTERNAL_ERROR;
  if (err instanceof TW5FirebaseError) {
    statusCode = TW5FirebaseErrorToHTTPErrorCode[err.payload.code] || HTTP_INTERNAL_ERROR;
    Object.assign(responseData, err.payload);
  }
  return res.status(statusCode).json(responseData);
};
