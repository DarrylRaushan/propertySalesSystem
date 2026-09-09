/**
 * @shared/_core/errors
 * Shared error factory helpers used by the server SDK.
 */

/**
 * Creates a 403 Forbidden HTTP error.
 * Usage: throw ForbiddenError("reason")
 */
export function ForbiddenError(message: string): Error {
  const err = new Error(message) as Error & { status: number; statusCode: number };
  err.status = 403;
  err.statusCode = 403;
  return err;
}
