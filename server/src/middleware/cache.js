import { redis } from '../config/redis.js';

export const cache = (duration = 300) => { // Default 5 minutes
  return async (context, next) => {
    if (context.method !== 'GET') {
      return next();
    }

    const key = `cache:${context.url}:${JSON.stringify(context.query)}`;

    try {
      // Try to get cached response
      const cached = await redis.get(key);
      if (cached) {
        context.body = JSON.parse(cached);
        context.set('X-Cache', 'HIT');
        return;
      }

      // If not cached, proceed with request
      await next();

      // Cache the response
      if (context.body && context.status === 200) {
        await redis.setex(key, duration, JSON.stringify(context.body));
        context.set('X-Cache', 'MISS');
      }
    } catch (error) {
      // If redis is unavailable, proceed without caching
      await next();
    }
  };
};

// Cache middleware factory with different durations
export const cacheFactory = {
  // Short-lived cache (1 minute) for frequently changing data
  short: () => cache(60),

  // Medium cache (5 minutes) for semi-static data
  medium: () => cache(300),

  // Long cache (1 hour) for static data
  long: () => cache(3600),

  // Custom duration cache
  custom: (seconds) => cache(seconds)
};

// Cache invalidation middleware
export const invalidateCache = (patterns) => {
  return async (context, next) => {
    await next();

    if (context.status === 200 && (context.method === 'POST' || context.method === 'PUT' || context.method === 'DELETE')) {
      try {
        if (Array.isArray(patterns)) {
          // Delete multiple patterns
          for (const pattern of patterns) {
            const keys = await redis.keys(`cache:${pattern}`);
            if (keys.length > 0) {
              await redis.del(keys);
            }
          }
        } else {
          // Delete single pattern
          const keys = await redis.keys(`cache:${patterns}`);
          if (keys.length > 0) {
            await redis.del(keys);
          }
        }
      } catch (error) {
        // Log error but don't fail the request
        console.error('Cache invalidation error:', error);
      }
    }
  };
};

// Cache specific middleware for different resources
export const projectCache = cache(300); // 5 minutes cache for project data
export const teamCache = cache(300); // 5 minutes cache for team data
export const studentCache = cache(300); // 5 minutes cache for student data
export const analyticsCache = cache(600); // 10 minutes cache for analytics

// Cache with conditional invalidation
export const conditionalCache = (duration = 300, condition = () => true) => {
  return async (context, next) => {
    if (!condition(context)) {
      return next();
    }

    const key = `cache:${context.url}:${JSON.stringify(context.query)}`;

    try {
      const cached = await redis.get(key);
      if (cached) {
        context.body = JSON.parse(cached);
        context.set('X-Cache', 'HIT');
        return;
      }

      await next();

      if (context.body && context.status === 200) {
        await redis.setex(key, duration, JSON.stringify(context.body));
        context.set('X-Cache', 'MISS');
      }
    } catch (error) {
      await next();
    }
  };
};