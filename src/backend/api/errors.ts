import * as functions from 'firebase-functions';
import * as express from 'express';

export class HTTPError extends Error {
    statusCode:number;
    constructor(message:string, statusCode = 500) {
        super(message)
        Error.captureStackTrace(this, HTTPError);
        this.statusCode = statusCode;
    }
}

export const HTTP_BAD_REQUEST = 400;
export const HTTP_FORBIDDEN = 403;
export const HTTP_NOT_FOUND = 404;
export const HTTP_CONFLICT = 409;

export const sendErr = (res:express.Response, err:HTTPError, statusCode?:number) => {
    functions.logger.error(err.message, err.stack);
    return res.status(err.statusCode || statusCode || 500).json({message: err.message, stack: err.stack});
}

module.exports = {HTTPError, HTTP_CONFLICT, HTTP_FORBIDDEN, HTTP_BAD_REQUEST, sendErr};
