import logger from "../utils/logger.js";

/**
 * Middleware to handle request timeouts with custom timeouts for different routes
 * @param {number} defaultTimeoutMs - Default timeout in milliseconds
 */
export const timeoutMiddleware = (defaultTimeoutMs = 30000) => {
  return (app) => {
    return app
      .onRequest(({ request }) => {
        // Define custom timeouts for specific routes that may need more time
        let timeoutMs = defaultTimeoutMs;

        // Give authentication routes a longer timeout as they involve database operations
        if (request.url.includes("/api/auth/")) {
          timeoutMs = 15000; // Reduced from 60000ms to 15000ms (15 seconds)
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
          logger.warn(`Request timeout after ${timeoutMs}ms:`, {
            url: request.url,
            method: request.method,
            service: "project-mgmt-api",
            timestamp: new Date().toISOString(),
          });
        }, timeoutMs);

        return { controller, timeoutId };
      })
      .onAfterHandle(({ timeoutId }) => {
        clearTimeout(timeoutId);
      });
  };
};
