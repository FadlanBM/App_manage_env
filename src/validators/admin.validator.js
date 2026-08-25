import { body } from 'express-validator';

export const adminRegisterRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

export const adminLoginRules = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const createAppRules = [
  body('appName').trim().notEmpty().withMessage('App name is required'),
];

export const createSecretRules = [
  body('appId').isUUID().withMessage('Valid appId is required'),
  body('keyName').trim().notEmpty().withMessage('keyName is required'),
  body('value').trim().notEmpty().withMessage('value is required'),
];

export const createBulkSecretsRules = [
  body('secrets')
    .isArray({ min: 1, max: 50 }).withMessage('secrets must be an array with 1-50 items'),
  body('secrets.*.appId').isUUID().withMessage('Each secret must have a valid appId'),
  body('secrets.*.keyName').trim().notEmpty().withMessage('Each secret must have a keyName'),
  body('secrets.*.value').trim().notEmpty().withMessage('Each secret must have a value'),
];
