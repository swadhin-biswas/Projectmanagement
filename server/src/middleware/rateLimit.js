import { TooManyRequestsError } from "../utils/errors.js";
import logger from "../utils/logger.js";

const getClientIp = (request) => {
  return request.headers?.['x-forwarded-for']?.split(',')[0].trim() ||
         request.socket?.remoteAddress ||
         'unknown';
};

// In-memory store for rate limiting
const store = new Map();

export const createRateLimitMiddleware = ({ windowMs = 900000, max = 100 } = {}) => {
  // Return a function that accepts the app instance and applies rate limiting
  return (app) => {
    return app.onBeforeHandle(({ request, set }) => {
      const ip = getClientIp(request);
      const now = Date.now();

      // Clean up old entries
      for (const [key, value] of store) {
        if (now - value.timestamp > windowMs) {
          store.delete(key);
        }
      }

      // Get or create rate limit record
      const record = store.get(ip) || {
        count: 0,
        timestamp: now,
        resetTime: now + windowMs
      };

      // Reset count if window has passed
      if (now - record.timestamp > windowMs) {
        record.count = 0;
        record.timestamp = now;
        record.resetTime = now + windowMs;
      }

      // Increment request count
      record.count++;
      store.set(ip, record);

      // Log rate limit info
      logger.debug('Rate limit check:', {
        ip,
        count: record.count,
        limit: max,
        remaining: Math.max(0, max - record.count),
        reset: new Date(record.resetTime).toISOString()
      });

      // Check if limit exceeded
      if (record.count > max) {
        logger.warn('Rate limit exceeded:', { ip, endpoint: request.url });
        throw new TooManyRequestsError("Too many requests, please try again later");
      }

      // Set rate limit headers
      set.headers = {
        ...set.headers,
        'X-RateLimit-Limit': max.toString(),
        'X-RateLimit-Remaining': Math.max(0, max - record.count).toString(),
        'X-RateLimit-Reset': Math.ceil(record.resetTime / 1000).toString()
      };
    });
  };
};

// Different rate limit configurations
export const authRateLimit = createRateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5 // 5 attempts
});

export const apiRateLimit = createRateLimitMiddleware({
  windowMs: 60 * 1000, // 1 minute
  max: 60 // 60 requests per minute
});

export const uploadRateLimit = createRateLimitMiddleware({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10 // 10 uploads per hour
});

export const submissionRateLimit = createRateLimitMiddleware({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 5 // 5 submissions per day
});