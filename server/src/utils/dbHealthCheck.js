import mongoose from "mongoose";
import logger from "./logger.js";

/**
 * Checks the health of the MongoDB connection
 * @returns {Object} Health status of the database connection
 */
export default async function dbHealthCheck() {
  try {
    const state = mongoose.connection.readyState;

    // Connection state codes:
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    const stateMap = {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting",
    };

    const status = stateMap[state] || "unknown";

    // If connected, perform a simple ping to ensure the connection is responsive
    let pingResult = null;
    let responseTime = null;

    if (state === 1) {
      try {
        const startTime = Date.now();
        // Execute a simple command to check db responsiveness
        pingResult = await mongoose.connection.db.admin().ping();
        responseTime = Date.now() - startTime;
      } catch (pingError) {
        logger.error("Database ping failed", { error: pingError });
        pingResult = { error: pingError.message };
      }
    }

    // Get additional connection information
    const connectionInfo =
      state === 1
        ? {
            host: mongoose.connection.host,
            port: mongoose.connection.port,
            name: mongoose.connection.name,
            responseTime: responseTime ? `${responseTime}ms` : null,
          }
        : null;

    return {
      success: state === 1,
      status: {
        state: status,
        code: state,
        healthy: state === 1 && pingResult && pingResult.ok === 1,
        connectionInfo,
        lastError: global.lastDbError || null,
        retryAttempts: global.dbRetryAttempts || 0,
      },
    };
  } catch (error) {
    logger.error("Failed to check database health", { error });
    return {
      success: false,
      status: {
        state: "error",
        code: -1,
        healthy: false,
        error: error.message,
        lastError: global.lastDbError || null,
      },
    };
  }
}
