import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

// Define log levels in incremental order
const levels: Record<string, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  verbose: 4,
};

// Get effective log level based on environment variable
const getEffectiveLevel = () => {
  const configuredLevel = (process.env.LOG_LEVEL || 'info').toLowerCase();
  const levelValue = levels[configuredLevel] || levels.info;

  // Create an array of valid levels based on configured level value
  return Object.entries(levels)
    .filter(([_, value]) => value <= levelValue)
    .map(([level, _]) => level);
};

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
    new DailyRotateFile({
      filename: 'logs/api-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true,
      // Only log messages that match the effective levels
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
        winston.format(info => {
          const effectiveLevels = getEffectiveLevel();
          return effectiveLevels.includes(info.level) ? info : false;
        })()
      ),
    }),
  ],
});

// Helper function to check if a level should be logged
const shouldLog = (level: string): boolean => {
  const configuredLevel = (process.env.LOG_LEVEL || 'info').toLowerCase();
  return levels[level] <= levels[configuredLevel];
};

// Define a type for the metadata object
type LogMetadata = Record<string, unknown>;

export const Logger = {
  error: (message: string, meta?: LogMetadata) => {
    if (shouldLog('error')) logger.error(message, meta);
  },
  warn: (message: string, meta?: LogMetadata) => {
    if (shouldLog('warn')) logger.warn(message, meta);
  },
  info: (message: string, meta?: LogMetadata) => {
    if (shouldLog('info')) logger.info(message, meta);
  },
  debug: (message: string, meta?: LogMetadata) => {
    if (shouldLog('debug')) logger.debug(message, meta);
  },
  verbose: (message: string, meta?: LogMetadata) => {
    if (shouldLog('verbose')) logger.verbose(message, meta);
  },
};
