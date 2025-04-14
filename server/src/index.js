import { swagger } from "@elysiajs/swagger";
import { config } from "dotenv";
import { Elysia } from "elysia";
import connectToDatabase from "./config/database.js";
import { DatabaseError, ValidationError } from "./utils/errors.js";
import logger, { logApiCall } from "./utils/logger.js";
import { registerApiRedirects } from "./utils/routeHelpers.js";

// Import middleware
import { authMiddleware } from "./middleware/auth.js";
import { elysiaCorsMiddleware } from "./middleware/cors.js";
import staticFilesMiddleware from "./middleware/staticFiles.js";
import routeProtection from "./utils/routeAuth.js";

// Import routes with explicit names
import activityRoutes from "./routes/activityRoutes.js";

import adminRoutes from "./routes/adminRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import calendarRoutes from "./routes/calendarRoutes.js";
import calendarServiceRoutes from "./routes/calendarServiceRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import exportRoutes from "./routes/exportRoutes.js";
import invitationRoutes from "./routes/invitationRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import milestoneRoutes from "./routes/milestoneRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import sessionRoutes from "./routes/sessionRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import supervisorRoutes from "./routes/supervisorRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";

// Import the new team routes

// Load environment variables
config();

// Check for JWT secret
if (!process.env.JWT_SECRET) {
  logger.error("FATAL ERROR: JWT_SECRET is not defined in .env");
  process.exit(1);
}

// Initialize express app with error handling
const app = new Elysia().use(swagger()).onError(({ error, set }) => {
  logger.error("Application error:", error);

  if (error instanceof ValidationError) {
    set.status = 400;
    return {
      success: false,
      error: error.message,
      code: "VALIDATION_ERROR",
    };
  }

  if (error instanceof DatabaseError) {
    set.status = 503;
    return {
      success: false,
      error: "Database operation failed. Please try again.",
      code: "DB_ERROR",
    };
  }

  set.status = error.status || 500;
  return {
    success: false,
    error:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : error.message,
    code: "INTERNAL_ERROR",
  };
});

// Apply Swagger before any other middleware or routes
app.use(
  swagger({
    documentation: {
      info: {
        title: "Research Project Management API",
        version: "1.0.0",
        description:
          "API documentation for the Research Project Management System. This API provides endpoints for managing research projects, teams, users, and more.",
        contact: {
          name: "API Support",
          email: "support@research-project.example.com",
          url: "https://research-project.example.com/support",
        },
        license: {
          name: "MIT",
          url: "https://opensource.org/licenses/MIT",
        },
      },
      tags: [
        { name: "Auth", description: "Authentication endpoints" },
        { name: "Users", description: "User management" },
        { name: "Teams", description: "Team management" },
        { name: "Projects", description: "Project management" },
        { name: "Sessions", description: "Academic session management" },
        { name: "Students", description: "Student-specific operations" },
        { name: "Supervisors", description: "Supervisor-specific operations" },
        { name: "Admin", description: "Administrative operations" },
        { name: "Dashboard", description: "Dashboard data" },
        { name: "Documentation", description: "API documentation" },
      ],
      servers: [
        {
          url: process.env.API_URL || "http://localhost:3000",
          description: "Development server",
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description: "Enter your JWT token in the format: Bearer {token}",
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    path: "/swagger",
    swaggerOptions: {
      persistAuthorization: true,
    },
  })
);

// Apply CORS middleware
app.use(elysiaCorsMiddleware());

// Apply static files middleware
app.use(staticFilesMiddleware());

// Apply authentication middleware
app.use(authMiddleware);

// Add request logging middleware to log all API calls with timing and error details
app.derive(({ request }) => {
  // Store start time for calculating duration
  const startTime = performance.now();
  const url = new URL(request.url);
  const method = request.method;
  const path = url.pathname;

  // Store these to access them in the afterHandle hook
  return {
    startTime,
    requestMethod: method,
    requestPath: path,
  };
});

// Custom response formatter as a decorator/hook
app.on(
  "afterHandle",
  ({ response, set, startTime, requestMethod, requestPath }) => {
    // Calculate request duration
    const duration = Math.round(performance.now() - startTime);

    // Log the API call
    const status = set.status || 200;
    let error = null;

    // Check if response contains an error
    if (response && typeof response === "object" && response.error) {
      error = response.error;
    }

    // Log the API call with duration and status
    logApiCall(requestMethod, requestPath, status, duration, error);

    // Handle empty or null responses
    if (!response) {
      return {
        success: true,
        data: {},
        timestamp: new Date().toISOString(),
      };
    }

    // Special case for the student profile endpoint
    if (
      requestPath === "/api/students/profile" &&
      typeof response === "object" &&
      response.success === true
    ) {
      logger.debug(
        "Preserving original structure for student profile response"
      );
      // Add timestamp if it doesn't exist but otherwise preserve structure
      if (!response.timestamp) {
        response.timestamp = new Date().toISOString();
      }
      return response;
    }

    // Format response if needed, but preserve original fields
    if (typeof response === "object" && !response.timestamp) {
      // For registration and login responses, preserve all fields (token, user, message, etc.)
      if (
        requestPath.includes("/api/auth/register") ||
        requestPath.includes("/api/auth/login")
      ) {
        // Ensure necessary fields exist for auth responses
        return {
          success: response.success !== undefined ? response.success : true,
          token: response.token || null,
          user: response.user || null,
          error: response.error || null,
          ...response, // Include any other fields from the original response
          timestamp: new Date().toISOString(),
        };
      }

      // For other responses, ensure we have success and data fields
      // Only add data field if it doesn't already exist to avoid overwriting
      const result = {
        success: response.success !== undefined ? response.success : true,
        timestamp: new Date().toISOString(),
      };

      // Add other fields from the original response
      Object.keys(response).forEach((key) => {
        result[key] = response[key];
      });

      // Only add data field if it doesn't already exist
      if (!response.data) {
        result.data = response.message
          ? { message: response.message }
          : { ...response };
      }

      return result;
    }

    // For primitive responses, wrap them
    if (typeof response !== "object") {
      return {
        success: true,
        data: { value: response },
        timestamp: new Date().toISOString(),
      };
    }

    // If response already has timestamp, just return it as is
    return response;
  }
);

// Apply timeout and response time tracking as a decorator/hook
app.on("request", async ({ request, set }) => {
  const timeout = parseInt(process.env.REQUEST_TIMEOUT || "30000");
  const startTime = Date.now();
  set.responseStartTime = startTime;

  // Set initial headers
  set.headers = {
    ...set.headers,
    "X-Response-Time": "0ms",
  };
});

// Apply rate limiting middleware - simplified inline implementation
const ipRequestCounts = new Map();
app.on("request", ({ request, set }) => {
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 60; // 60 requests per minute

  const ip = request.headers["x-forwarded-for"] || "unknown";
  const now = Date.now();

  // Create or get existing record
  if (!ipRequestCounts.has(ip)) {
    ipRequestCounts.set(ip, { count: 0, resetTime: now + windowMs });
  }

  const record = ipRequestCounts.get(ip);

  // Reset if time window has passed
  if (now > record.resetTime) {
    record.count = 0;
    record.resetTime = now + windowMs;
  }

  // Increment request count
  record.count++;

  // Set headers
  set.headers["X-RateLimit-Limit"] = maxRequests.toString();
  set.headers["X-RateLimit-Remaining"] = Math.max(
    0,
    maxRequests - record.count
  ).toString();
  set.headers["X-RateLimit-Reset"] = record.resetTime.toString();

  // Return 429 if limit exceeded
  if (record.count > maxRequests) {
    set.status = 429;
    throw new Error("Too many requests, please try again later");
  }
});

app.onError(({ code, error, set }) => {
  logger.error(`Error: ${error.message}`, { code, stack: error.stack });

  if (error instanceof ValidationError) {
    set.status = 400;
    return {
      success: false,
      error: error.message,
      code: "VALIDATION_ERROR",
    };
  }

  if (code === "UNAUTHORIZED" || error.message.includes("Not authorized")) {
    set.status = 401;
    return {
      success: false,
      error: error.message || "Authentication required",
      code: "UNAUTHORIZED",
    };
  }

  if (code === "FORBIDDEN" || error.message.includes("Access denied")) {
    set.status = 403;
    return {
      success: false,
      error: error.message || "Access denied",
      code: "FORBIDDEN",
    };
  }

  set.status = error.status || 500;
  return {
    success: false,
    error:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : error.message,
    code: code || "INTERNAL_ERROR",
  };
});

// Log the imported route modules
logger.info("Route modules loaded:", {
  authRoutes: !!authRoutes,
  studentRoutes: !!studentRoutes,
  adminRoutes: !!adminRoutes,
  supervisorRoutes: !!supervisorRoutes,
  // Add other routes as needed
});

/**
 * SECURITY: Apply route protection to ensure all API routes require authentication
 * By using group middleware, we ensure all API endpoints require JWT authentication
 * The only exceptions are the public paths defined in authMiddleware
 */
app.group("/api", (group) => {
  // Apply authentication middleware to the entire API group
  // This ensures all API routes require a valid JWT token by default
  // The public paths defined in authMiddleware will be exceptions
  group.derive(({ request }) => {
    logger.debug(`API request to: ${request.url}`);
    return {};
  });

  return (
    group
      // Mount auth routes (some auth routes like login/register are public)
      .use(authRoutes)
      // Apply admin-only protection to admin routes
      .group("/admin", (adminGroup) => {
        routeProtection.adminOnly(adminGroup);
        return adminGroup.use(adminRoutes);
      })
      // Apply supervisor-only protection to supervisor routes
      .group("/supervisor", (supervisorGroup) => {
        routeProtection.supervisorOnly(supervisorGroup);
        return supervisorGroup.use(supervisorRoutes);
      })
      // Apply student-only protection to student routes
      .group("/student", (studentGroup) => {
        routeProtection.studentOnly(studentGroup);
        return studentGroup.use(studentRoutes);
      })

      .use(dashboardRoutes)
      .use(sessionRoutes)
      .use(projectRoutes)
      .use(activityRoutes)
      .use(analyticsRoutes)
      .use(calendarRoutes)
      .use(calendarServiceRoutes)
      .use(exportRoutes)
      .use(invitationRoutes)
      .use(messageRoutes)
      .use(milestoneRoutes)
      .use(notificationRoutes)
      .use(uploadRoutes)
  );
});

// Root endpoint for health check
app.get("/", () => {
  return {
    success: true,
    message: "Research Project Management API is running",
    timestamp: new Date().toISOString(),
  };
});

// Health check endpoint
app.get("/health", () => {
  return {
    success: true,
    status: "UP",
    message: "Server is healthy",
    timestamp: new Date().toISOString(),
  };
});

// Register root-level routes that redirect to API endpoints for backward compatibility
registerApiRedirects(app, [
  // Simple GET routes
  "/notifications",
  "/notifications/unread/count",
  "/user/profile",
  "/dashboard",
  "/calendar",

  // Team routes that should redirect to student team endpoints
  "/teams",
  "/teams/my-team",
  { path: "/teams/:id", methods: ["GET", "PUT", "DELETE"] },
  { path: "/teams/:id/invite", methods: ["POST"] },
  { path: "/teams/:id/leave", methods: ["POST"] },
  { path: "/teams/:id/remove-member", methods: ["POST"] },

  // Student-specific team routes
  "/api/student-teams",
  "/api/student-teams/invitations",
  { path: "/api/student-teams/:id/leave", methods: ["DELETE"] },

  // Routes with multiple methods
  { path: "/projects", methods: ["GET", "POST"] },
  { path: "/sessions", methods: ["GET", "POST"] },
  { path: "/messages", methods: ["GET", "POST"] },
  { path: "/projects/:id", methods: ["GET", "PUT", "DELETE"] },
  { path: "/users/:id", methods: ["GET", "PUT"] },
]);

// Handle 404 for undefined routes
app.all("*", ({ set }) => {
  set.status = 404;
  return {
    success: false,
    error: "Route not found",
    code: "NOT_FOUND",
  };
});

// Replace hardcoded port with configurable port
const PORT = process.env.PORT || 30000;
const MAX_PORT_RETRIES = 10;

// Function to check if a port is in use
const isPortInUse = async (port) => {
  return new Promise((resolve) => {
    const server = require("net").createServer();

    server.once("error", (err) => {
      if (err.code === "EADDRINUSE") {
        resolve(true); // Port is in use
      } else {
        resolve(false);
      }
    });

    server.once("listening", () => {
      server.close();
      resolve(false); // Port is available
    });

    server.listen(port);
  });
};

// Function to start server with error handling and port retry
const startServer = async (startPort, retryCount = 0) => {
  try {
    // First establish database connection
    logger.info("Attempting to connect to MongoDB database");
    const connection = await connectToDatabase();

    if (!connection) {
      throw new Error("Failed to establish database connection");
    }

    logger.info("✅ MongoDB connection established successfully");

    // Try to start the server
    const port = await findAvailablePort(startPort, retryCount);
    await app.listen({
      port: port,
      hostname: "0.0.0.0",
    });

    logger.info(
      `🚀 Server running on port ${port} and accessible from all network interfaces`
    );
    return true;
  } catch (error) {
    logger.error("Server startup error:", error);

    if (retryCount < MAX_PORT_RETRIES) {
      const nextPort = startPort + retryCount + 1;
      logger.info(
        `⚠️ Port ${
          startPort + retryCount
        } is not available. Trying port ${nextPort}...`
      );
      return startServer(startPort, retryCount + 1);
    }

    logger.error(`Failed to start server after ${MAX_PORT_RETRIES} attempts`);
    throw error;
  }
};

// Function to find an available port
const findAvailablePort = async (startPort, offset = 0) => {
  const port = startPort + offset;
  if (await isPortInUse(port)) {
    if (offset >= MAX_PORT_RETRIES) {
      throw new Error(
        `No available ports found after ${MAX_PORT_RETRIES} attempts`
      );
    }
    return findAvailablePort(startPort, offset + 1);
  }
  return port;
};

// Single combined MongoDB connection and server startup with proper error handling
(async () => {
  try {
    await startServer(PORT);
  } catch (error) {
    logger.error("❌ Application startup failed:", error);
    process.exit(1);
  }
})();

// WebSocket setup with enhanced error handling
app.ws("/ws", {
  open(ws) {
    ws.isAlive = true;
    logger.info("🔌 WebSocket connection opened");
  },
  message(ws, message) {
    try {
      const data = JSON.parse(message);
      ws.send(JSON.stringify({ type: "ack", data }));
    } catch (error) {
      logger.error("❌ WebSocket message error:", {
        error: error.message,
        stack: error.stack,
        rawMessage:
          typeof message === "string"
            ? message.substring(0, 100)
            : "non-string message",
      });
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Invalid message format",
        })
      );
    }
  },
  close(ws) {
    logger.info("👋 WebSocket connection closed");
  },
  error(ws, error) {
    logger.error("❌ WebSocket error:", {
      error: error.message,
      stack: error.stack,
    });
  },
});

// Track memory usage periodically
const MEMORY_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
setInterval(() => {
  const memoryUsage = process.memoryUsage();
  logger.info("Memory usage stats:", {
    rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
    heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
    heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
    external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`,
  });
}, MEMORY_CHECK_INTERVAL);

// Export app for testing
export default app;
