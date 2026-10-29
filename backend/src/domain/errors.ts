/** Error with an HTTP status and a stable machine code the frontend can translate. */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message?: string,
    public readonly fields?: Record<string, string>,
  ) {
    super(message ?? code);
  }
}

export const badRequest = (code: string, message?: string, fields?: Record<string, string>) => new AppError(400, code, message, fields);
export const unauthorized = (code = "unauthorized") => new AppError(401, code);
export const forbidden = (code = "forbidden") => new AppError(403, code);
export const notFound = (code = "not_found") => new AppError(404, code);
export const conflict = (code: string, message?: string) => new AppError(409, code, message);
