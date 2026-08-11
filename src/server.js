import app from './app.js';
import config from './config/index.js';
import logger from './logger.js';

const server = app.listen(config.port, () => {
  logger.info({ port: config.port, env: config.nodeEnv }, 'Server started');
});

// Graceful shutdown
const shutdown = (signal) => {
  logger.warn({ signal }, 'Shutting down gracefully');
  server.close(() => process.exit(0));
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
