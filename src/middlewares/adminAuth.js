import { verifyAccessToken } from '../utils/jwt.js';

export function adminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      message: 'Access token required',
      data: null,
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyAccessToken(token);
    if (payload.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Admin access required',
        data: null,
      });
    }
    req.admin = payload;
    next();
  } catch {
    return res.status(401).json({
      status: 'error',
      message: 'Token invalid atau expired',
      data: null,
    });
  }
}
