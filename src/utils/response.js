export function sendSuccess(res, data = null, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({ status: 'success', message, data });
}

export function sendFail(res, data = null, message = 'Validation error', statusCode = 422) {
  return res.status(statusCode).json({ status: 'fail', message, data });
}

export function sendError(res, message = 'Internal Server Error', statusCode = 500) {
  return res.status(statusCode).json({ status: 'error', message, data: null });
}
