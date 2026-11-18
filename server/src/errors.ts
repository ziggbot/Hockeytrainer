export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
  }
}

export const badRequest = (msg: string) => new HttpError(400, msg);
export const unauthorized = (msg = "Du behöver logga in.") => new HttpError(401, msg);
export const forbidden = (msg = "Du saknar behörighet för detta.") => new HttpError(403, msg);
export const notFound = (msg = "Hittades inte.") => new HttpError(404, msg);
export const conflict = (msg: string) => new HttpError(409, msg);
