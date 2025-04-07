import jwt from "jsonwebtoken";
import { ForbiddenError, UnauthorizedError } from "../utils/errors.js";
import logger from "../utils/logger.js";

export const authorize = (roles = []) => {
  return async (context) => {
    try {
      const { request } = context;
      const authorization = request.headers?.authorization;

      if (!authorization) {
        logger.warn("Authorization header missing", {
          path: request.url,
          method: request.method,
        });
        throw new UnauthorizedError("Authentication required");
      }

      const token = authorization.split(" ")[1];
      if (!token) {
        logger.warn("Bearer token missing", {
          path: request.url,
          method: request.method,
        });
        throw new UnauthorizedError("Authentication token required");
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check if user has the required role
        if (roles.length && !roles.includes(decoded.role)) {
          logger.warn("Insufficient role permissions", {
            path: request.url,
            method: request.method,
            requiredRoles: roles,
            userRole: decoded.role,
            userId: decoded.userId,
          });
          throw new ForbiddenError(`Required role: ${roles.join(" or ")}`);
        }

        // Attach the decoded user to the context
        context.user = decoded;
        return;
      } catch (jwtError) {
        if (jwtError.name === "TokenExpiredError") {
          logger.warn("Token expired", {
            path: request.url,
            method: request.method,
          });
          throw new UnauthorizedError("Token expired");
        }

        logger.warn("Invalid token", {
          path: request.url,
          method: request.method,
          error: jwtError.message,
        });
        throw new UnauthorizedError("Invalid token");
      }
    } catch (error) {
      if (
        error instanceof UnauthorizedError ||
        error instanceof ForbiddenError
      ) {
        throw error;
      }

      logger.error("🔒 Authorization error:", {
        error: error.message,
        stack: error.stack,
        path: context.request?.url,
      });
      throw new UnauthorizedError("Authentication failed");
    }
  };
};
