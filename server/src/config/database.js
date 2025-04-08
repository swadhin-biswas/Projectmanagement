// database.js
import mongoose from "mongoose";
import logger from "../utils/logger.js";

/**
 * Connect to MongoDB database with retry mechanism
 * @param {number} retryAttempt - Current retry attempt
 * @returns {Promise<mongoose.Connection>} Mongoose connection object
 */
const connectDatabase = async (retryAttempt = 0) => {
  // Use either MONGODB_URI or MONGO_URI to ensure compatibility
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!mongoUri) {
    logger.error("No MongoDB connection string found in environment variables");
    throw new Error("MongoDB connection string is missing");
  }

  const maxRetries = 5;
  const retryDelay = 5000; // 5 seconds

  try {
    logger.info("Attempting to connect to MongoDB...");

    // Force close any existing connection first to avoid multiple connections
    if (mongoose.connection.readyState !== 0) {
      logger.info("Closing existing MongoDB connection before reconnecting");
      await mongoose.connection.close();
    }

    // Strict connection options
    const connection = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      heartbeatFrequencyMS: 10000,
      maxPoolSize: 100,
      minPoolSize: 5,
      connectTimeoutMS: 30000,
      retryWrites: true,
      w: "majority", // Ensure write confirmation
      readPreference: "primaryPreferred",
    });

    // Clear any previous error state
    global.dbConnectionIssue = false;
    global.lastDbError = null;
    global.dbRetryAttempts = 0;

    // Add connection event listeners for better monitoring
    mongoose.connection.on("error", (err) => {
      logger.error(`MongoDB connection error: ${err.message}`, { error: err });
      global.dbConnectionIssue = true;
      global.lastDbError = err;
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("MongoDB disconnected");
      global.dbConnectionIssue = true;
    });

    mongoose.connection.on("reconnected", () => {
      logger.info("MongoDB reconnected successfully");
      global.dbConnectionIssue = false;
      global.lastDbError = null;
    });

    // Test the connection with a ping
    await connection.connection.db.admin().ping();

    logger.info(`MongoDB Connected: ${connection.connection.host}`);
    return connection;
  } catch (error) {
    logger.error(`Error connecting to MongoDB: ${error.message}`, {
      error,
      mongoUriRedacted: mongoUri.replace(
        /mongodb(\+srv)?:\/\/[^:]+:[^@]+@/,
        "mongodb$1://****:****@"
      ),
    });

    global.dbConnectionIssue = true;
    global.lastDbError = error;
    global.dbRetryAttempts = (global.dbRetryAttempts || 0) + 1;

    // Implement retry logic with backoff
    if (retryAttempt < maxRetries) {
      logger.info(
        `Retrying connection in ${retryDelay}ms (Attempt ${
          retryAttempt + 1
        } of ${maxRetries})`
      );
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
      return connectDatabase(retryAttempt + 1);
    } else {
      logger.error(`Failed to connect to MongoDB after ${maxRetries} attempts`);
      throw error; // Throw error instead of returning null
    }
  }
};

// ES module export
export default connectDatabase;
