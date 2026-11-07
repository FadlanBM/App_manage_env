import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './docs/swagger.js';
import routes from './routes/index.js';
import { notFound } from './middlewares/notFound.js';
import { errorHandler } from './middlewares/errorHandler.js';
import config from './config/index.js';
import logger from './logger.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '../public');

app.set('trust proxy', 1); // Allow correct IP reading behind Cloudflare Tunnel

// Security & parsing
app.use(
  helmet({
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://cdn.tailwindcss.com',
          'https://cdn.jsdelivr.net',
          'https://www.gstatic.com',
          'https://apis.google.com',
        ],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdn.jsdelivr.net'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'validator.swagger.io', 'https://lh3.googleusercontent.com'],
        connectSrc: ["'self'", '*', 'https://*.googleapis.com', 'https://*.firebaseio.com'],
        frameSrc: ["'self'", 'https://*.firebaseapp.com'],
        upgradeInsecureRequests: null,
      },
    },
    strictTransportSecurity: false,
  })
);
app.use(
  cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
  })
);
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn({ ip: req.ip, path: req.path }, 'Rate limit exceeded');
    res.status(429).json({ status: 'error', message: 'Too many requests, please try again later', data: null });
  },
  skip: () => config.nodeEnv === 'test',
});
app.use('/api', limiter);

// Logging (skip in test)
app.get('/api/config/firebase', (_req, res) => {
  if (!config.firebaseProjectId || !config.firebaseWebApiKey) {
    return res.status(503).json({ status: 'error', message: 'Firebase OAuth is not configured' });
  }
  return res.json({ apiKey: config.firebaseWebApiKey, projectId: config.firebaseProjectId, authDomain: `${config.firebaseProjectId}.firebaseapp.com` });
});
if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/favicon.ico', (_req, res) => res.status(204).end());

// Static Web Dashboard
app.use(express.static(publicDir));
app.get(['/', '/dashboard'], (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// API documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec));

// API routes
app.use('/api', routes);

// Error handling
app.use(notFound);
app.use(errorHandler);

export default app;
