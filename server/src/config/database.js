// database.js
import mongoose from "mongoose";
import logger from './logger';

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
    // Modern connection options without deprecated flags
    const connection = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      heartbeatFrequencyMS: 10000,
      maxPoolSize: 100,
      minPoolSize: 5,
      connectTimeoutMS: 30000,
      retryWrites: true,
      readPreference: "primaryPreferred"
    });

    // Add connection event listeners for better monitoring
    mongoose.connection.on("error", (err) => {
      logger.error(`MongoDB connection error: ${err.message}`, { error: err });
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("MongoDB disconnected, attempting to reconnect");
    });

    mongoose.connection.on("reconnected", () => {
      logger.info("MongoDB reconnected successfully");
    });

    logger.info(`MongoDB Connected: ${connection.connection.host}`);
    return connection;
  } catch (error) {
    logger.error(`Error connecting to MongoDB: ${error.message}`, { error });

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
      // Set global flag to indicate database issues instead of crashing
      global.dbConnectionIssue = true;
      // Return null instead of exiting to allow application to run with limited functionality
      return null;
    }
  }
};

// ES module export
export default connectDatabase;