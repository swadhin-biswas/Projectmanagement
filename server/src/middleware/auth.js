import { jwt } from "@elysiajs/jwt";
import { config } from "../config/config.js";
import { User } from "../models/User.js";
import { NotFoundError, UnauthorizedError } from "../utils/errors.js";
import logger from "../utils/logger.js";

// Create JWT middleware for Elysia
export const jwtAuth = () => {
  const jwtPlugin = jwt({
    name: "jwt",
    secret: config.jwt.secret,
    exp: config.jwt.expiresIn,
  });

  return async (app) => {
    // Apply the JWT plugin
    app.use(jwtPlugin);

    // Add authentication middleware
    app.derive(async ({ jwt, headers, set }) => {
      try {
        // Log incoming authorization header for debugging (first 20 chars only)
        const authHeader = headers.authorization || "";
        logger.debug(
          `Received Authorization header: ${authHeader.substring(0, 20)}...`
        );

        // Extract the token from the Authorization header
        const token = authHeader.replace("Bearer ", "");

        if (!token) {
          logger.debug("No JWT token provided");
          set.status = 401;
          throw new UnauthorizedError("Authentication required");
        }

        // Log token snippet for debugging
        logger.debug(`Extracted token: ${token.substring(0, 20)}...`);

        // Verify the token
        const payload = await jwt.verify(token);

        if (!payload) {
          logger.debug("JWT verification failed");
          set.status = 401;
          throw new UnauthorizedError("Invalid or expired token");
        }

        // Log payload for debugging
        logger.debug("JWT payload:", payload);

        // Check if userId exists in payload
        if (!payload.userId) {
          logger.error("JWT payload missing userId");
          set.status = 401;
          throw new UnauthorizedError("Invalid token payload");
        }

        // Fetch user from database to ensure they exist and are active
        const user = await User.findById(payload.userId).select("-password");

        if (!user) {
          logger.debug(`User not found for userId: ${payload.userId}`);
          set.status = 401;
          throw new NotFoundError("User not found");
        }

        // Add user to the request context
        logger.debug(`Authentication successful for user: ${payload.userId}`);
        return {
          user: { id: user._id.toString(), email: user.email, role: user.role },
        };
      } catch (error) {
        // If the error is already a custom error, rethrow it
        if (error.status) {
          throw error;
        }

        // Otherwise, convert to UnauthorizedError
        logger.error("Authentication error:", error);
        set.status = 401;
        throw new UnauthorizedError("Authentication failed");
      }
    });
  };
};

// Generate a signed JWT token
export const signToken = async (app, userId, email, role) => {
  try {
    const payload = {
      userId,
      email,
      role,
    };

    logger.debug(`Signing JWT for userId: ${userId}`, payload);

    // Sign the token
    const token = await app.jwt.sign(payload);

    return {
      token,
      expiresIn: config.jwt.expiresIn,
    };
  } catch (error) {
    logger.error("Error signing JWT token:", error);
    throw error;
  }
};
