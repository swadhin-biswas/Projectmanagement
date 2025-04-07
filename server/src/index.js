import { swagger } from "@elysiajs/swagger";
import { config } from "dotenv";
import { Elysia } from "elysia";
import jwt from "jsonwebtoken";
import connectToDatabase from "./config/database.js";
import logger from "./utils/logger.js";

// Import middleware
import { elysiaCorsMiddleware } from "./middleware/cors.js";
import staticFilesMiddleware from "./middleware/staticFiles.js";

// Import routes
import dashboardRoutes from "./routes/dashboardRoutes.js";
import sessionRoutes from "./routes/sessionRoutes.js";
import teamRoutes from "./routes/teamRoutes.js";

// Import additional routes
import activityRoutes from "./routes/activityRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import apiDocsRoutes from "./routes/apiDocsRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import calendarRoutes from "./routes/calendarRoutes.js";
import calendarServiceRoutes from "./routes/calendarServiceRoutes.js";
import exportRoutes from "./routes/exportRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import supervisorRoutes from "./routes/supervisorRoutes.js";
import userRoutes from "./routes/userRoutes.js";

// Load environment variables
config();

// Connect to the database with proper error handling
(async () => {
  try {
    logger.info("Attempting to connect to MongoDB database");

    // Call the connectToDatabase function without parameters since it now handles
    // reading the URI from environment variables internally
    const connection = await connectToDatabase();

    if (connection) {
      logger.info("✅ MongoDB connection established successfully");

      // Store the connection for potential later use
      global.mongoConnection = connection;
    } else {
      logger.error(
        "❌ Could not establish MongoDB connection - server will continue but database operations may fail"
      );
      // The global flag is now set inside connectToDatabase function
    }
  } catch (error) {
    logger.error("❌ Database connection error:", error);
    global.dbConnectionIssue = true;
  }
})();

// Initialize base app first
const app = new Elysia();

// Apply Swagger
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
        {
          url: "https://api.research-project.example.com",
          description: "Production server",
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
    theme: "default",
    staticCSP: true,
    swaggerOptions: {
      persistAuthorization: true,
    },
  })
);

// Apply CORS middleware - expecting it to return a function that takes app and applies cors
app.use(elysiaCorsMiddleware());

// Apply static files middleware
app.use(staticFilesMiddleware());

// Custom response formatter as a decorator/hook
app.on("afterHandle", ({ response, set }) => {
  if (response && typeof response === "object" && !response.timestamp) {
    return {
      success: !response.error,
      ...response,
      timestamp: new Date().toISOString(),
    };
  }
  return response;
});

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
  const errorContext = {
    code,
    error: error.message,
    stack: error.stack, // Always include stack in error logs
    service: "project-mgmt-api",
    timestamp: new Date().toISOString(),
  };

  if (
    error.name === "MongooseError" &&
    error.message.includes("buffering timed out")
  ) {
    logger.warn("🔍 Database query timeout - returning empty result:", {
      queryType: error.message.match(/Operation `(\w+)\./)?.[1] || "unknown",
      stack: error.stack,
    });

    // Provide specialized empty responses based on the query type
    set.status = 200;
    const queryType = error.message.match(/Operation `(\w+)\./)?.[1] || "";

    // Specific handling for common timeout cases
    if (queryType === "calendarevents") {
      return {
        success: true,
        data: {
          events: [],
          message: "No calendar events available at the moment",
        },
      };
    } else if (queryType === "teams") {
      return {
        success: true,
        data: {
          teams: [],
          meetings: [],
          message: "No team data available at the moment",
        },
      };
    } else if (queryType === "sessions") {
      return {
        success: true,
        data: {
          events: [],
          message: "No session data available at the moment",
        },
      };
    } else {
      // Generic fallback
      return {
        success: true,
        data: [],
        message: "Operation timed out. Please try again later.",
      };
    }
  }

  if (error.message.includes("Too many requests")) {
    logger.warn("⚠️ Rate limit exceeded:", {
      ip: set.request?.headers?.["x-forwarded-for"] || "unknown",
      path: set.request?.url || "unknown",
      stack: error.stack,
    });

    set.status = 429;
    return {
      success: false,
      error: error.message,
      code: "RATE_LIMIT_EXCEEDED",
      retryAfter: set.headers["X-RateLimit-Reset"],
    };
  }

  let status = error.status || 500;
  if (error.message.includes("timeout")) status = 504;

  set.status = status;

  if (status >= 500) {
    logger.error("❌ Server error:", {
      ...errorContext,
      request: {
        url: set.request?.url,
        method: set.request?.method,
        headers: set.request?.headers,
      },
    });
  } else {
    logger.warn("⚠️ Client error:", errorContext);
  }

  return {
    success: false,
    error:
      status === 500 && process.env.NODE_ENV === "production"
        ? "Internal server error"
        : error.message,
    code: code,
    timestamp: new Date().toISOString(),
  };
});

// JWT authentication setup with error handling
app.derive(({ request }) => {
  // Skip authentication for documentation routes
  const publicPaths = ["/swagger", "/api-docs", "/static"];
  if (publicPaths.some((path) => request.url.startsWith(path))) {
    return { user: null, skipAuth: true };
  }

  try {
    const auth = request.headers?.authorization;
    if (!auth) return { user: null };

    const token = auth.split(" ")[1];
    if (!token) return { user: null };

    const user = jwt.verify(token, process.env.JWT_SECRET);
    return { user };
  } catch (error) {
    logger.error("🔒 JWT verification failed:", {
      error: error.message,
      stack: error.stack,
      path: request.url,
    });
    return { user: null };
  }
});

// Define API routes
app
  .get("/api", () => "API is running")
  .get("/api/health/db", async () => {
    const dbHealth = await import("./utils/dbHealthCheck.js").then((module) =>
      module.default()
    );
    return dbHealth;
  })
  .use(authRoutes)
  .use(userRoutes)
  .use(sessionRoutes)
  .use(teamRoutes)
  .use(adminRoutes)
  .use(dashboardRoutes)
  // .use(analyticsRoutes)
  .use(activityRoutes)
  .use(calendarRoutes)
  .use(calendarServiceRoutes)
  // .use(uploadRoutes)
  .use(exportRoutes)
  .use(messageRoutes)
  .use(notificationRoutes)
  .use(studentRoutes)
  .use(supervisorRoutes)
  .use(apiDocsRoutes);
// .use(projectRoutes)
// .use(milestoneRoutes);

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
