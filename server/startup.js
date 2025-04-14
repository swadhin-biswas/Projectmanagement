import cors from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { config } from "dotenv";
import Elysia from "elysia";
import fs from "fs";
import mongoose from "mongoose";
import net from "net";
import path from "path";
import { authMiddleware } from "./src/middleware/auth.js";
import adminRoutes from "./src/routes/adminRoutes.js";
import authRoutes from "./src/routes/authRoutes.js";
import dashboardRoutes from "./src/routes/dashboardRoutes.js";
import sessionRoutes from "./src/routes/sessionRoutes.js";
import studentRoutes from "./src/routes/studentRoutes.js";
import logger from "./src/utils/logger.js";

/**
 * SECURITY NOTES:
 *
 * This application uses enhanced JWT security features:
 * 1. Token blacklisting for revoked tokens (logout)
 * 2. Consistent role-based authorization checks
 * 3. Token expiration validation
 * 4. Additional claims (jti, iat, exp, iss, aud)
 * 5. Proper token validation
 *
 * For security reasons, ensure:
 * - JWT_SECRET is set in production environment
 * - All private routes use proper authorization checks
 * - The client properly handles token storage
 */

// Load environment variables
config();

// Check if required files exist
const requiredFiles = [
  "./src/index.js",
  "./src/routes/dashboardRoutes.js",
  "./src/routes/sessionRoutes.js",
  "./src/controllers/adminController.js",
];

console.log("🔍 Checking for required files...");
requiredFiles.forEach((file) => {
  try {
    fs.accessSync(path.resolve(process.cwd(), file));
    console.log(`✅ ${file} exists`);
  } catch (err) {
    console.error(`❌ ${file} is missing or inaccessible`);
  }
});

// Function to check if a port is available
const isPortAvailable = (port) => {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", (err) => {
      if (err.code === "EADDRINUSE") {
        resolve(false);
      } else {
        resolve(false);
      }
    });

    server.once("listening", () => {
      server.close();
      resolve(true);
    });

    server.listen(port);
  });
};

// Function to find an available port starting from a base port
const findAvailablePort = async (basePort) => {
  let port = basePort;
  const maxPort = basePort + 10; // Try up to 10 ports

  while (port <= maxPort) {
    if (await isPortAvailable(port)) {
      return port;
    }
    port++;
  }

  throw new Error(
    `Could not find an available port in range ${basePort}-${maxPort}`
  );
};

// Main function to start the server
const startServer = async () => {
  try {
    const basePort = parseInt(process.env.PORT || 30000);
    const availablePort = await findAvailablePort(basePort);

    console.log(`✅ Found available port: ${availablePort}`);
    console.log(`🚀 Starting server on port ${availablePort}...`);

    // Set the port in environment
    process.env.PORT = availablePort.toString();

    // We'll use this port in the startup function below
    // No need to spawn a separate process

    process.on("SIGINT", () => {
      console.log("Stopping server...");
      process.exit(0);
    });
  } catch (error) {
    console.error(`❌ ${error.message}`);
    process.exit(1);
  }
};

// Read in environment variables
const PORT = process.env.PORT || 30000; // Fixed from 300000
const DB_URI = process.env.MONGODB_URI;
const NODE_ENV = process.env.NODE_ENV || "development";

// Connection options
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

// Connect to MongoDB
async function connectToMongoDB() {
  logger.info("Attempting to connect to MongoDB database");

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
    // Add CORS middleware (customize as needed)
    .use(
      cors({
        origin: "*", // In production, change to specific domains
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
    // Register routes individually instead of using a routes.js file
    .use(authRoutes)
    .use(adminRoutes)
    .use(dashboardRoutes)
    .use(sessionRoutes)
    .use(studentRoutes);

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
  logger.info(`Starting server in ${NODE_ENV} mode`);

  // Find an available port first
  await startServer();

  // Get the port from environment (set by startServer)
  const PORT = process.env.PORT || 30000;

  // Connect to database
  const isConnected = await connectToMongoDB();
  if (!isConnected && NODE_ENV === "production") {
    logger.error("Failed to connect to database, exiting in production mode");
    process.exit(1);
  }

  // Create app
  const app = createApp();

  // Start server
  app.listen(
    {
      port: PORT,
      hostname: "0.0.0.0",
    },
    () => {
      logger.info(
        `🚀 Server running on port ${PORT} and accessible from all network interfaces`
      );

      // Log memory usage periodically
      setInterval(() => {
        const memoryUsage = process.memoryUsage();
        logger.info("Memory usage stats:", {
          rss: `${Math.round(memoryUsage.rss / (1024 * 1024))} MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / (1024 * 1024))} MB`,
          heapUsed: `${Math.round(memoryUsage.heapUsed / (1024 * 1024))} MB`,
          external: `${Math.round(memoryUsage.external / (1024 * 1024))} MB`,
        });
      }, 5 * 60 * 1000); // Log every 5 minutes
    }
  );

  return app;
}

// Export for importing in main application file
export { findAvailablePort, isPortAvailable, startServer, startup };

// If this file is run directly, start the server
// Otherwise, just export the functions
if (import.meta.url === import.meta.main) {
  startup().catch((err) => {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  });
}
