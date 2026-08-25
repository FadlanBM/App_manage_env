import { AppRepository } from '../repositories/app.repository.js';
import { compareAppSecret } from '../utils/hash.js';

export async function verifyApp(req, res, next) {
  const appId = req.headers['x-app-id'];
  const appSecret = req.headers['x-app-secret'];

  if (!appId || !appSecret) {
    return res.status(401).json({
      status: 'error',
      message: 'App credentials required',
      data: null,
    });
  }

  const app = await AppRepository.findById(appId);
  if (!app || !app.isActive) {
    return res.status(401).json({
      status: 'error',
      message: 'App not registered',
      data: null,
    });
  }

  // Check against all active secrets for this app
  const secrets = await AppRepository.findActiveSecrets(app.id);
  let valid = false;
  for (const s of secrets) {
    if (await compareAppSecret(appSecret, s.secret)) {
      valid = true;
      break;
    }
  }

  if (!valid) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid app secret',
      data: null,
    });
  }

  req.appId = app.id;
  req.appName = app.appName;
  next();
}
