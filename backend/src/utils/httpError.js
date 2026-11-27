export function createHttpError(message, statusCode, details = {}) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return Object.assign(error, details);
}
