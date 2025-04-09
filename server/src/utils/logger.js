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

// Define shared timestamp format
const timestampFormat = winston.format.timestamp({
  format: "YYYY-MM-DD HH:mm:ss.SSS",
});

// --- File Log Format (JSON for easy parsing) ---
const fileLogFormat = winston.format.combine(
  timestampFormat,
  winston.format.errors({ stack: true }),
  winston.format.splat(), // Necessary for %s, %d, %j
  winston.format.json() // Log as JSON in files
);

// --- Console Log Format (Readable with Color) ---
const consoleFormat = winston.format.combine(
  timestampFormat,
  winston.format.colorize(), // Add colors
  winston.format.errors({ stack: true }),
  winston.format.printf(
    ({ level, message, timestamp, stack, function: func, ...meta }) => {
      const functionName = func ? ` [${func}]` : ""; // Show function name if provided
      let metaString = Object.keys(meta).length ? JSON.stringify(meta) : "";
      // Indent stack trace and metadata for readability
      const stackString = stack
        ? `\n  Stack: ${stack.split("\n").join("\n  ")}`
        : "";
      metaString = metaString ? `\n  Meta: ${metaString}` : "";

      return `${timestamp} ${level}${functionName}: ${message}${metaString}${stackString}`;
    }
  )
);

// Determine log level for console based on NODE_ENV
const consoleLogLevel =
  process.env.NODE_ENV === "production" ? "info" : "debug";

// Determine main log level (controls file logs primarily)
const mainLogLevel =
  process.env.LOG_LEVEL ||
  (process.env.NODE_ENV === "production" ? "info" : "debug");

// --- Transports ---

// 1. Console Transport (Level controlled by NODE_ENV)
const consoleTransport = new winston.transports.Console({
  format: consoleFormat,
  level: consoleLogLevel, // Explicitly set level for console
  handleExceptions: true,
  handleRejections: true,
});

// 2. Application Info File Transport
const fileTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logsDir, "application-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  maxSize: "20m",
  maxFiles: "14d",
  level: "info", // Log info and above to this file
  format: fileLogFormat,
});

// 3. Error File Transport
const errorFileTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logsDir, "error-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  maxSize: "20m",
  maxFiles: "14d",
  level: "error", // Only errors to this file
  format: fileLogFormat,
});

// 4. Combined Info File Transport (Redundant? Maybe remove if app.log is enough)
// const combinedFileTransport = new winston.transports.DailyRotateFile({
//   filename: path.join(logsDir, "combined-%DATE%.log"),
//   datePattern: "YYYY-MM-DD",
//   maxSize: "20m",
//   maxFiles: "14d",
//   level: "info",
//   format: fileLogFormat,
// });

// 5. Dedicated Debug File Transport (NEW)
const debugFileTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logsDir, "debug-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  maxSize: "50m", // Allow larger size for debug logs
  maxFiles: "7d", // Keep for shorter duration
  level: "debug", // Log debug and above (effectively all levels if main level is debug)
  format: fileLogFormat,
  silent: process.env.NODE_ENV === "production", // Don't write debug logs in production
});

// 6. Exceptions File Transport
const exceptionTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logsDir, "exceptions-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  maxSize: "20m",
  maxFiles: "14d",
  format: fileLogFormat, // Use file format
});

// --- Create the Main Logger ---
const logger = winston.createLogger({
  level: mainLogLevel, // Use environment variable or default based on NODE_ENV
  format: fileLogFormat, // Default format for files (console uses its own)
  defaultMeta: { service: "research-mgmt-api" },
  transports: [
    consoleTransport,
    fileTransport,
    errorFileTransport,
    debugFileTransport, // Add the new debug file transport
    // combinedFileTransport, // Removed redundancy
  ],
  exitOnError: false, // Do not exit on handled exceptions
});

// Configure Exception Handling
logger.exceptions.handle(
  exceptionTransport, // Log exceptions to dedicated file
  consoleTransport // Also log exceptions to console
);

// Configure Unhandled Rejection Logging
process.on("unhandledRejection", (reason, promise) => {
  const stack =
    reason?.stack ||
    (reason instanceof Error ? reason.toString() : JSON.stringify(reason));
  logger.error("Unhandled Rejection:", {
    reason: reason instanceof Error ? reason.message : reason,
    stack: stack,
    location: "unhandledRejection handler",
  });
});

// Configure Uncaught Exception Logging (redundant with logger.exceptions.handle but provides fallback)
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", {
    error: error.message,
    stack: error.stack,
    location: "uncaughtException handler",
  });
  // Ensure process exits after logging
  winston.on("finish", () => {
    process.exit(1);
  });
  logger.end(); // Trigger finish event
  setTimeout(() => {
    process.exit(1);
  }, 2000); // Force exit after timeout
});

// --- API Call Logger (Simplified) ---
// Use the main logger but perhaps with a specific format if needed
// For simplicity now, we'll just use the main logger
const logApiCall = (method, path, status, duration, error = null) => {
  const level =
    status >= 500 || error ? "error" : status >= 400 ? "warn" : "info";
  logger.log(
    level,
    `HTTP ${method} ${path} - ${status} (${duration}ms)${
      error ? ` Error: ${error}` : ""
    }`
  );
};

// Export logger and utility
export { logApiCall };
export default logger;
