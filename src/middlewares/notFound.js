import createError from 'http-errors';

export function notFound(req, res, next) {
  next(createError(404, `Route ${req.method} ${req.originalUrl} not found`));
}
