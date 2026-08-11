import pino from 'pino';
import config from './config/index.js';

const transport = config.nodeEnv === 'development'
  ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
  : undefined;

const logger = pino({
  level: config.logLevel,
  ...(transport && { transport }),
});

export default logger;
