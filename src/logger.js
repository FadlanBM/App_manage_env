import pino from 'pino';
import config from './config/index.js';

// ponytail: serverless/bundler environments fail resolving worker thread transport targets
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const transport = !isServerless && config.nodeEnv === 'development'
  ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
  : undefined;

const logger = pino({
  level: config.logLevel,
  ...(transport && { transport }),
});

export default logger;
