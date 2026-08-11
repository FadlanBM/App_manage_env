import { sendError } from '../utils/response.js';
import logger from '../logger.js';

export function errorHandler(err, req, res, _next) {
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  if (process.env.NODE_ENV !== 'test') {
    logger.error({ err, statusCode }, 'Unhandled error');
  }

  return sendError(res, message, statusCode);
}
