import logger from '../utils/logger.js';

const connections = new Map();
const messageRates = new Map();

const RATE_LIMITS = {
  maxConnectionsPerUser: 3,
  maxMessagesPerMinute: 60,
  maxTypingEventsPerMinute: 30,
  connectionCooldown: 1000 // 1 second between connection attempts
};

export const rateLimiter = ({ windowMs = 900000, max = 100 } = {}) => {
  const requests = new Map();

  return {
    name: 'rate-limiter',
    beforeHandle: ({ request, set }) => {
      const ip = request.headers?.['x-forwarded-for']?.split(',')[0].trim() ||
                 request.headers?.['x-real-ip'] ||
                 'unknown';

      const now = Date.now();
      const windowStart = now - windowMs;

      // Clean old requests
      if (requests.has(ip)) {
        requests.get(ip).timestamps = requests.get(ip).timestamps.filter(
          time => time > windowStart
        );
      }

      // Initialize or get existing request record
      const record = requests.get(ip) || { timestamps: [] };
      record.timestamps.push(now);
      requests.set(ip, record);

      // Check if limit exceeded
      if (record.timestamps.length > max) {
        set.status = 429;
        return {
          error: 'Too many requests',
          message: 'Please try again later',
          nextValidRequestTime: new Date(record.timestamps[0] + windowMs).toISOString()
        };
      }
    }
  };
};

// Middleware to apply rate limiting to socket events
export const socketRateLimiter = (socket, next) => {
  const userId = socket.user?.id;
  if (!userId) {
    return next(new Error('User ID not found'));
  }

  // Check connection rate
  if (!rateLimiter.canConnect(userId)) {
    return next(new Error('Too many connection attempts'));
  }

  // Add rate limiting to socket events
  const emit = socket.emit;
  socket.emit = (...args) => {
    if (!rateLimiter.checkMessageRate(userId, args[0])) {
      logger.warn(`Rate limit blocked event ${args[0]} from user ${userId}`);
      return;
    }
    emit.apply(socket, args);
  };

  next();
};