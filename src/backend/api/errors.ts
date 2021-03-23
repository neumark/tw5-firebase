import * as express from 'express';
import { Logger } from '../../util/logger';

export class HTTPError extends Error {
    statusCode:number;
    constructor(message:string, statusCode = 500) {
        super(message)
        Error.captureStackTrace(this, HTTPError);
        this.statusCode = statusCode;
    }
}

function isHTTPError(err:Error): err is HTTPError {
  return 'statusCode' in err;
}

export const HTTP_BAD_REQUEST = 400;
export const HTTP_FORBIDDEN = 403;
export const HTTP_NOT_FOUND = 404;
export const HTTP_CONFLICT = 409;

export const sendErr = (err:Error, logger:Logger, res:express.Response) => {
    logger.error(err.message, err.stack);
    let statusCode = 500;
    if (isHTTPError(err)) {
      statusCode = err.statusCode;
    }
    return res.status(statusCode).json({message: err.message, stack: err.stack});
}

module.exports = {HTTPError, HTTP_CONFLICT, HTTP_FORBIDDEN, HTTP_BAD_REQUEST, sendErr};
