import { jwt } from "@elysiajs/jwt";
import jwtHelper from "../utils/jwtHelper.js";
import logger from "../utils/logger.js";

/**
 * JWT authentication middleware for Elysia
 *
 * This middleware adds JWT authentication to the Elysia app
 * It signs tokens with the provided secret and verifies them on protected routes
 */
export const authMiddleware = (app) => {
  const jwtSecret =
    process.env.JWT_SECRET || "fallback-secret-do-not-use-in-production";

  if (
    process.env.NODE_ENV === "production" &&
    process.env.JWT_SECRET === undefined
  ) {
    logger.error(
      "FATAL ERROR: JWT_SECRET is not defined in .env while in production mode"
    );
    throw new Error("JWT_SECRET must be defined in production environment");
  }

  // Define public paths that don't need authentication
  // SECURITY NOTE: Only add paths here that should be publicly accessible without authentication
  // All other paths will require a valid JWT token
  const publicPaths = [
    "/", // Root health check
    "/health", // Health check
    "/health/db", // DB health
    "/api/auth/login", // Auth endpoints
    "/api/auth/register",
    "/api/auth/reset-password-request",
    "/api/auth/reset-password",
    "/api/auth/verify-email",
    "/swagger", // API docs
    "/api-docs",
    /^\/swagger\/.*$/, // Swagger UI with exact regex
    /^\/assets\/.*$/, // Static assets
    /^\/api-docs\/.*$/, // API documentation
  ];

  // Configure JWT middleware
  app.use(
    jwt({
      name: "jwt", // The name to register the JWT helper as
      secret: jwtSecret,
      exp: "7d", // Set token expiration to 7 days
    })
  );

  // Add request handler to check JWT on all non-public routes
  app.derive(async ({ request, set }) => {
    const url = new URL(request.url);
    const path = url.pathname;

    // Skip authentication for public paths - use exact matching for API endpoints
    const isPublicPath = publicPaths.some((publicPath) => {
      if (typeof publicPath === "string") {
        return path === publicPath; // Exact match for strings
      } else if (publicPath instanceof RegExp) {
        return publicPath.test(path);
      }
      return false;
    });

    if (isPublicPath) {
      logger.debug(`Public path access (exact match): ${path}`);
      return { user: null };
    }

    // Get token from authorization header
    const authorization = request.headers.get("authorization");

    if (!authorization || !authorization.startsWith("Bearer ")) {
      logger.warn(
        `Unauthorized access attempt (no/invalid Authorization header): ${path}`
      );
      set.status = 401;
      set.headers = {
        ...set.headers,
        "WWW-Authenticate": "Bearer", // Add proper WWW-Authenticate header for 401 responses
      };
      return {
        user: null,
        unauthorized: true,
        errorMessage: "Authorization header with Bearer token required",
      };
    }

    try {
      // Extract and verify token
      const token = authorization.split(" ")[1];

      // Use the enhanced JWT helper for verification
      const payload = await jwtHelper.verify(token);

      if (!payload) {
        // Invalid token
        logger.warn(`Invalid token provided for: ${path}`);
        set.status = 401;
        set.headers = {
          ...set.headers,
          "WWW-Authenticate": 'Bearer error="invalid_token"',
        };
        return {
          user: null,
          unauthorized: true,
          errorMessage: "Invalid authentication token",
        };
      }

      // Check token expiration
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        logger.warn(`Expired token provided for: ${path}`);
        set.status = 401;
        set.headers = {
          ...set.headers,
          "WWW-Authenticate":
            'Bearer error="invalid_token", error_description="The token has expired"',
        };
        return {
          user: null,
          unauthorized: true,
          errorMessage: "Token expired",
        };
      }

      logger.debug(
        `Authenticated access: ${path} by user ID: ${payload.id}, role: ${payload.role}`
      );

      // Add user data to context
      return {
        user: payload,
        // Add token helper methods
        token: {
          isValid: true,
          payload,
          original: token, // Store original token for potential revocation
        },
      };
    } catch (error) {
      logger.error(`JWT verification error for path ${path}:`, error);
      set.status = 401;
      set.headers = {
        ...set.headers,
        "WWW-Authenticate": 'Bearer error="invalid_token"',
      };
      return {
        user: null,
        unauthorized: true,
        errorMessage: "Invalid authentication token",
      };
    }
  });

  // Add a global onRequest hook to handle unauthorized requests
  app.onRequest(({ unauthorized, set, errorMessage }) => {
    if (unauthorized) {
      set.headers = {
        ...set.headers,
        "WWW-Authenticate": "Bearer",
      };
      throw new Error(
        errorMessage ||
          "Authentication required. Please login and provide a valid token."
      );
    }
  });

  // Add a logout function to the context
  app.derive(({ token }) => {
    return {
      // Method to revoke the current token
      revokeCurrentToken: () => {
        if (token?.original) {
          jwtHelper.revokeToken(token.original);
          return true;
        }
        return false;
      },
    };
  });

  return app;
};

// In-memory cache of JWT signing apps to avoid recreating them
let jwtSigningApp = null;

/**
 * Sign a JWT token for a user
 *
 * @param {string} userId - The user's ID
 * @param {string} email - The user's email
 * @param {string} role - The user's role
 * @returns {Object} - The token and expiration information
 */
export const signToken = async (userId, email, role) => {
  try {
    if (!userId || !email || !role) {
      logger.error("Missing required parameters for JWT signing", {
        userId: !!userId,
        email: !!email,
        role: !!role,
      });
      throw new Error("Missing required user information for JWT token");
    }

    // Create payload with user info
    const payload = {
      id: userId,
      email,
      role,
      timestamp: Date.now(),
    };

    // Sign the token using our JWT helper
    const token = await jwtHelper.sign(payload);

    // Return token and expiration info
    return {
      token,
      expiresIn: "7d",
    };
  } catch (error) {
    logger.error("JWT signing error:", error);
    throw new Error("Failed to generate authentication token");
  }
};
