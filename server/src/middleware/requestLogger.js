import logger from '../utils/logger.js';

export const requestLogger = () => {
  return (app) => {
    app.onRequest(({ request }) => {
      const startTime = Date.now();

      // Get request details
      const method = request.method;
      const url = request.url;
      const userAgent = request.headers['user-agent'];
      const referer = request.headers.referer;
      const clientIP = request.headers['x-forwarded-for'] || request.socket.remoteAddress;

      // Log the incoming request
      logger.info(`📥 Frontend Request`, {
        method,
        url,
        userAgent,
        referer,
        clientIP,
        timestamp: new Date().toISOString()
      });

      // Log response on completion
      return () => {
        const duration = Date.now() - startTime;
        logger.info(`📤 Frontend Response`, {
          method,
          url,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString()
        });
      };
    });

    return app;
  };
};