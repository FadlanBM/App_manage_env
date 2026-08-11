import { verifyAccessToken } from '../utils/jwt.js';

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      message: 'Token required',
      data: null,
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyAccessToken(token);
    if (payload.app_id !== req.appName) {
      return res.status(401).json({
        status: 'error',
        message: 'Token app mismatch',
        data: null,
      });
    }
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({
      status: 'error',
      message: 'Token invalid atau expired',
      data: null,
    });
  }
}
