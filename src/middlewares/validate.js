import { validationResult } from 'express-validator';
import { sendFail } from '../utils/response.js';

export function validate(validations) {
  return async (req, res, next) => {
    for (const validation of validations) {
      await validation.run(req);
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const fieldErrors = {};
      for (const e of errors.array()) {
        fieldErrors[e.path] = e.msg;
      }
      return sendFail(res, fieldErrors, 'Validation error', 422);
    }
    next();
  };
}
