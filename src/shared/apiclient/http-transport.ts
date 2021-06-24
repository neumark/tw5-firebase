export type HTTPMethod = 'GET' | 'PUT' | 'DELETE';

export type HTTPAPIRequest = {
    urlPath: string;
    body?: any;
    method?: HTTPMethod;
};

export interface HTTPTransport {
    request: (httpApiRequest: HTTPAPIRequest) => Promise<any>;
}

export class NetworkError extends Error {
    public statusCode?: number;
    public apiRequest?: HTTPAPIRequest;

    constructor({
        message,
        statusCode,
        apiRequest,
    }: {
        message: string;
        statusCode?: number;
        apiRequest?: HTTPAPIRequest;
    }) {
        super(message);
        this.statusCode = statusCode;
        this.apiRequest = apiRequest;
        // see: typescriptlang.org/docs/handbook/release-notes/typescript-2-2.html
        // tslint:disable-next-line:no-unsafe-any
        Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain
        this.name = NetworkError.name; // stack traces display correctly now
    }
}
