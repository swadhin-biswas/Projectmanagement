import cors from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { config } from "dotenv";
import Elysia from "elysia";
import mongoose from "mongoose";
import { authMiddleware } from "./src/middleware/auth.js";
import adminRoutes from "./src/routes/adminRoutes.js";
import authRoutes from "./src/routes/authRoutes.js";
import dashboardRoutes from "./src/routes/dashboardRoutes.js";
import sessionRoutes from "./src/routes/sessionRoutes.js";
import logger from "./src/utils/logger.js";

// Load environment variables
config();

// Read in environment variables
const PORT = process.env.PORT || 30000;
const DB_URI = process.env.MONGO_URI; // Changed from MONGODB_URI to MONGO_URI
const NODE_ENV = process.env.NODE_ENV || "development";

// Connection options
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

// Connect to MongoDB
async function connectToMongoDB() {
  logger.info("Attempting to connect to MongoDB database");
  logger.info(`Using DB URI: ${DB_URI}`);

  try {
    logger.info("Attempting to connect to MongoDB...");
    const conn = await mongoose.connect(DB_URI, options);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    logger.info("✅ MongoDB connection established successfully");
    return true;
  } catch (error) {
    logger.error(`Error connecting to MongoDB: ${error.message}`, { error });
    return false;
  }
}

// Initialize and configure Elysia app
function createApp() {
  const app = new Elysia()
    // Add CORS middleware
    .use(
      cors({
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        allowedHeaders: ["Content-Type", "Authorization"],
      })
    )
    // Add Swagger documentation (in development only)
    .use(
      NODE_ENV === "development"
        ? swagger({
            documentation: {
              info: {
                title: "Research Management System API",
                version: "1.0.0",
                description:
                  "API documentation for the Research Management System",
              },
              tags: [
                { name: "Auth", description: "Authentication endpoints" },
                { name: "Admin", description: "Admin-only endpoints" },
                { name: "Students", description: "Student endpoints" },
                { name: "Supervisors", description: "Supervisor endpoints" },
                { name: "Projects", description: "Project management" },
                { name: "Teams", description: "Team management" },
              ],
              components: {
                securitySchemes: {
                  bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                    description: "Enter JWT token",
                  },
                },
              },
            },
          })
        : (app) => app
    )
    // Add JWT authentication middleware
    .use(authMiddleware)
    // Register routes
    .use(authRoutes)
    .use(adminRoutes)
    .use(dashboardRoutes)
    .use(sessionRoutes);

  // Root endpoint for health check
  app.get("/", () => {
    return {
      status: "healthy",
      message: "Research Management System API",
      timestamp: new Date().toISOString(),
    };
  });

  // Add health check endpoint for database
  app.get("/health/db", async () => {
    const isConnected = mongoose.connection.readyState === 1;
    return {
      status: isConnected ? "connected" : "disconnected",
      database: "MongoDB",
      timestamp: new Date().toISOString(),
    };
  });

  return app;
}

// Startup logic
async function startup() {
  logger.info(`Starting server in ${NODE_ENV} mode on port ${PORT}`);

  // Connect to database
  const isConnected = await connectToMongoDB();
  if (!isConnected && NODE_ENV === "production") {
    logger.error("Failed to connect to database, exiting in production mode");
    process.exit(1);
  }

  // Create app
  const app = createApp();

  // Start server
  app.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT}`);
  });

  return app;
}

// Start the server
if (import.meta.url === import.meta.main) {
  startup().catch((err) => {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  });
}
