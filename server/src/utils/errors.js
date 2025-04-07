// Custom Error Classes for the application
/**
 * ValidationError
 * Used for data validation errors
 */
export class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
    this.path = null;
    this.status = 400;
  }
}

/**
 * UnauthorizedError
 * Used for authentication errors (401 status code)
 */
export class UnauthorizedError extends Error {
  constructor(message) {
    super(message);
    this.name = "UnauthorizedError";
    this.status = 401;
  }
}

/**
 * ForbiddenError
 * Used for authorization errors (403 status code)
 */
export class ForbiddenError extends Error {
  constructor(message) {
    super(message);
    this.name = "ForbiddenError";
    this.status = 403;
  }
}

/**
 * NotFoundError
 * Used for resource not found errors (404 status code)
 */
export class NotFoundError extends Error {
  constructor(message = "Resource not found") {
    super(message);
    this.name = "NotFoundError";
    this.status = 404;
  }
}

/**
 * ConflictError
 * Used for resource conflicts (409 status code)
 */
export class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = "ConflictError";
    this.status = 409;
  }
}

/**
 * TooManyRequestsError
 * Used for rate limit exceeded errors (429 status code)
 */
export class TooManyRequestsError extends Error {
  constructor(message = "Too many requests, please try again later") {
    super(message);
    this.name = "TooManyRequestsError";
    this.status = 429;
  }
}

/**
 * ServerError
 * Used for internal server errors (500 status code)
 */
export class ServerError extends Error {
  constructor(message) {
    super(message);
    this.name = "ServerError";
    this.status = 500;
  }
}

/**
 * TimeoutError
 * Used for request timeout errors (504 status code)
 */
export class TimeoutError extends Error {
  constructor(message = "Request timed out") {
    super(message);
    this.name = "TimeoutError";
    this.status = 504;
  }
}

/**
 * DatabaseError
 * Used for database connection or operation errors (503 status code)
 */
export class DatabaseError extends Error {
  constructor(message = "Database operation failed") {
    super(message);
    this.name = "DatabaseError";
    this.status = 503;
  }
}

// Alias for backward compatibility
export const AuthenticationError = UnauthorizedError;
export const AuthorizationError = ForbiddenError;
