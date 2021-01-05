class HTTPError extends Error {
    constructor(message, statusCode = 500) {
        super(message)
        Error.captureStackTrace(this, HTTPError);
        this.statusCode = statusCode;
    }
}

const HTTP_BAD_REQUEST = 400;
const HTTP_FORBIDDEN = 403;
const HTTP_CONFLICT = 409;

const sendErr = (res, err, statusCode) => {
    console.log(err.stack);
    return res.status(err.statusCode || statusCode || 500).json({message: err.message, stack: err.stack});
}

module.exports = {HTTPError, HTTP_CONFLICT, HTTP_FORBIDDEN, HTTP_BAD_REQUEST, sendErr};
