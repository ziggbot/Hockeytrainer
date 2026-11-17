export class HttpError extends Error {
    statusCode;
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
    }
}
export const badRequest = (msg) => new HttpError(400, msg);
export const unauthorized = (msg = 'Du behöver logga in.') => new HttpError(401, msg);
export const forbidden = (msg = 'Du saknar behörighet för detta.') => new HttpError(403, msg);
export const notFound = (msg = 'Hittades inte.') => new HttpError(404, msg);
export const conflict = (msg) => new HttpError(409, msg);
//# sourceMappingURL=errors.js.map