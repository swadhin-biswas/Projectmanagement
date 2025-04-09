/**
 * Base API Error class that extends the built-in Error class
 * All custom API errors should extend this class
 */
export class ApiError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation Error - for request validation failures
 * Status: 400 Bad Request
 */
export class ValidationError extends ApiError {
  constructor(message = "Validation error", field = null) {
    super(message, 400);
    this.field = field;
  }
}

/**
 * Authentication Error - for invalid credentials
 * Status: 401 Unauthorized
 */
export class AuthenticationError extends ApiError {
  constructor(message = "Authentication failed") {
    super(message, 401);
  }
}

/**
 * Authorization Error - for insufficient permissions
 * Status: 403 Forbidden
 */
export class ForbiddenError extends ApiError {
  constructor(message = "Forbidden") {
    super(message, 403);
  }
}

/**
 * Not Found Error - for resources that don't exist
 * Status: 404 Not Found
 */
export class NotFoundError extends ApiError {
  constructor(message = "Resource not found") {
    super(message, 404);
  }
}

/**
 * Conflict Error - for duplicate resources
 * Status: 409 Conflict
 */
export class ConflictError extends ApiError {
  constructor(message = "Resource already exists") {
    super(message, 409);
  }
}

/**
 * Database Error - for database operations failures
 * Status: 500 Internal Server Error
 */
export class DatabaseError extends ApiError {
  constructor(message = "Database operation failed", originalError = null) {
    super(message, 500);
    this.originalError = originalError;
  }
}

/**
 * Service Error - for external service failures
 * Status: 502 Bad Gateway
 */
export class ServiceError extends ApiError {
  constructor(message = "External service error", service = null) {
    super(message, 502);
    this.service = service;
  }
}

/**
 * Rate Limit Error - for too many requests
 * Status: 429 Too Many Requests
 */
export class RateLimitError extends ApiError {
  constructor(message = "Too many requests", retryAfter = 60) {
    super(message, 429);
    this.retryAfter = retryAfter;
  }
}

/**
 * Timeout Error - for operations that take too long
 * Status: 504 Gateway Timeout
 */
export class TimeoutError extends ApiError {
  constructor(message = "Operation timed out") {
    super(message, 504);
  }
}

/**
 * JWT specific Authentication Error
 * Status: 401 Unauthorized
 */
export class UnauthorizedError extends ApiError {
  constructor(message = "Invalid or expired token") {
    super(message, 401);
  }
}
