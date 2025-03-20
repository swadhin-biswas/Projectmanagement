import { TooManyRequestsError } from '../utils/errors.js';

const store = new Map();

export const rateLimit = (options = { max: 100, window: 60000 }) => ({
  name: 'rate-limit',
  beforeHandle: ({ request }) => {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    
    // Clean up old entries
    for (const [key, value] of store) {
      if (now - value.timestamp > options.window) {
        store.delete(key);
      }
    }
    
    // Check and update rate limit
    const record = store.get(ip) || { count: 0, timestamp: now };
    
    if (now - record.timestamp > options.window) {
      record.count = 0;
      record.timestamp = now;
    }
    
    record.count++;
    store.set(ip, record);
    
    if (record.count > options.max) {
      throw new TooManyRequestsError('Too many requests');
    }
    
    // Set rate limit headers
    request.headers.set('X-RateLimit-Limit', options.max.toString());
    request.headers.set('X-RateLimit-Remaining', (options.max - record.count).toString());
    request.headers.set('X-RateLimit-Reset', (record.timestamp + options.window).toString());
  }
});
