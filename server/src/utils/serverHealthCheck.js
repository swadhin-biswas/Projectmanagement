import logger from "./logger.js";

export const registerHealthEndpoint = (app) => {
  // Register a health check endpoint
  app.get("/health", () => {
    logger.info("🏥 Health check performed");
    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      uptime: process.uptime(),
    };
  });
};
