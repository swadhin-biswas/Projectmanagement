import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import winston from "winston";
import "winston-daily-rotate-file";

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, "../../logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    // Format additional metadata
    const metaStr = Object.keys(meta).length
      ? "\n" + JSON.stringify(meta, null, 2)
      : "";

    // Include stack trace if available
    const stackStr = stack ? `\n${stack}` : "";

    return `${timestamp} [${level.toUpperCase()}]: ${message}${stackStr}${metaStr}`;
  })
);

// Define console format with colors for better readability
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    // Format additional metadata
    const metaStr = Object.keys(meta).length
      ? "\n" + JSON.stringify(meta, null, 2)
      : "";

    // Include stack trace if available
    const stackStr = stack ? `\n${stack}` : "";

    return `${timestamp} [${level}]: ${message}${stackStr}${metaStr}`;
  })
);

// Create file transports for different log levels
const fileTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logsDir, "application-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  maxSize: "20m",
  maxFiles: "14d",
  level: "info",
});

const errorFileTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logsDir, "error-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  maxSize: "20m",
  maxFiles: "14d",
  level: "error",
});

// Create console transport
const consoleTransport = new winston.transports.Console({
  format: consoleFormat,
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
});

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: logFormat,
  defaultMeta: { service: "research-mgmt-api" },
  transports: [consoleTransport, fileTransport, errorFileTransport],
  exitOnError: false,
});

// Create a separate transport specifically for uncaught exceptions
const exceptionTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logsDir, "exceptions-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  maxSize: "20m",
  maxFiles: "14d",
  format: logFormat,
});

// Handle uncaught exceptions and unhandled rejections with better formatting
logger.exceptions.handle(
  exceptionTransport,
  new winston.transports.Console({
    format: consoleFormat,
  })
);

// Setting up unhandled rejection logging with improved handling
process.on("unhandledRejection", (reason, promise) => {
  // Extract stack trace if available
  const stack =
    reason?.stack ||
    (reason instanceof Error ? reason.toString() : JSON.stringify(reason));

  logger.error("Unhandled Rejection:", {
    reason: reason instanceof Error ? reason.message : reason,
    stack: stack,
    // Add more details that might be useful for debugging
    location: "unhandledRejection handler",
  });
});

// Add handler for uncaught exceptions to provide better context
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", {
    error: error.message,
    stack: error.stack,
    location: "uncaughtException handler",
  });

  // For critical exceptions, we may want to exit after logging
  // Giving time for the log to be written
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Add handler for SIGTERM and SIGINT to gracefully log before shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received. Shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT received. Shutting down gracefully");
  process.exit(0);
});

// Export both as default and named export for compatibility
export { logger };
export default logger;
