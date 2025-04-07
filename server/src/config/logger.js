import path from 'path';
import winston from 'winston';
import 'winston-daily-rotate-file';

// Define log directory
const logDir = path.join(process.cwd(), 'logs');

// Define log levels with emojis
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Define emoji format
const addEmoji = winston.format((info) => {
  const emojiMap = {
    error: '🚨 ',
    warn: '⚠️ ',
    info: '📝 ',
    http: '🌐 ',
    debug: '🐛 '
  };
  info.message = `${emojiMap[info.level] || ''}${info.message}`;
  return info;
});

// Define custom format
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  addEmoji(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaString}`;
  })
);

// Create logger instance
const logger = winston.createLogger({
  levels: logLevels,
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: customFormat,
  transports: [
    // Error logs
    new winston.transports.DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '30d',
      maxSize: '20m',
      zippedArchive: true
    }),

    // Combined logs
    new winston.transports.DailyRotateFile({
      filename: path.join(logDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d',
      maxSize: '20m',
      zippedArchive: true
    })
  ],
  exceptionHandlers: [
    new winston.transports.DailyRotateFile({
      filename: path.join(logDir, 'exceptions.log'),
      maxFiles: '30d',
      maxSize: '20m',
      zippedArchive: true
    })
  ],
  rejectionHandlers: [
    new winston.transports.DailyRotateFile({
      filename: path.join(logDir, 'rejections.log'),
      maxFiles: '30d',
      maxSize: '20m',
      zippedArchive: true
    })
  ]
});

// Add console transport in development with colored output
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        addEmoji(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} ${level}: ${message}`;
        })
      )
    })
  );
}

// Create stream for Morgan HTTP logger
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  }
};

export default logger;