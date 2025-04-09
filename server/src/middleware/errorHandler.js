import logger from "../utils/logger.js";

const errorHandler = (err, req, res, next) => {
  // Log the error with detailed context
  logger.error(`API Error: ${err.message}`, {
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
    },
    request: {
      path: req.path,
      method: req.method,
      query: req.query,
      body: sanitizeRequestBody(req.body),
      ip: req.ip,
      headers: sanitizeHeaders(req.headers),
    },
    user: req.user ? req.user.id : "unauthenticated",
  });

  // Prevent controller objects from being sent in the response
  const safeError = {
    name: err.name,
    message: err.message,
    status: err.status || 500,
    error:
      process.env.NODE_ENV === "development" ? err.message : "Server Error",
  };

  // Handle specific error types
  if (err.name === "ValidationError") {
    safeError.status = 400;
    safeError.errors = Object.values(err.errors).map((val) => val.message);
  } else if (err.name === "MongoServerError" && err.code === 11000) {
    safeError.status = 400;
    safeError.message = "Duplicate key error - record already exists";
  } else if (
    err.name === "JWTExpired" || // Common jose error name
    err.code === "ERR_JWT_EXPIRED" || // Common jose error code
    err.message?.includes("expire") || // General check
    err.message?.includes("expired")
  ) {
    safeError.status = 401;
    safeError.message = "Your session has expired. Please log in again.";
  } else if (
    err.name === "JWTInvalid" || // Common jose error name
    err.code === "ERR_JWT_INVALID" || // Common jose error code
    err.message?.includes("invalid token") ||
    err.message?.includes("Invalid token") ||
    err.message?.includes("Authentication required") || // From @elysiajs/jwt perhaps
    err.message?.includes("Authentication failed") // From @elysiajs/jwt perhaps
  ) {
    safeError.status = 401;
    safeError.message = "Invalid token. Please log in again.";
  }

  // Handle timeout errors explicitly
  if (err.message && err.message.includes("buffering timed out")) {
    safeError.status = 503;
    safeError.message = "Database operation timed out. Please try again later.";
  }

  // For critical errors, log additional debug info
  if (safeError.status >= 500) {
    logger.error("Critical error details:", {
      processInfo: {
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
      },
    });
  }

  return res.status(safeError.status).json({
    success: false,
    error: safeError.message,
    errors: safeError.errors,
    status: safeError.status,
  });
};

// Helper function to sanitize sensitive data from request bodies
function sanitizeRequestBody(body) {
  if (!body) return null;

  const sanitized = { ...body };

  // Remove sensitive fields
  const sensitiveFields = [
    "password",
    "token",
    "secret",
    "apiKey",
    "creditCard",
  ];
  sensitiveFields.forEach((field) => {
    if (sanitized[field]) sanitized[field] = "[REDACTED]";
  });

  return sanitized;
}

// Helper function to sanitize headers
function sanitizeHeaders(headers) {
  if (!headers) return null;

  const sanitized = { ...headers };

  // Remove sensitive headers
  const sensitiveHeaders = ["authorization", "cookie", "x-api-key"];
  sensitiveHeaders.forEach((header) => {
    if (sanitized[header]) sanitized[header] = "[REDACTED]";
  });

  return sanitized;
}

export default errorHandler;
