// filepath: /home/swadhin/r/server/src/utils/authUtils.js
import logger from "./logger.js";

/**
 * Authorization utility functions for consistent auth checks across routes
 */

/**
 * Verifies that a user is authenticated
 * @param {Object} context - The request context (containing user from JWT)
 * @returns {Object} - The authenticated user or throws an error
 * @throws {Error} - If user is not authenticated
 */
export const requireAuth = (context) => {
  if (!context.user) {
    const path = new URL(context.request?.url || "unknown").pathname;
    logger.warn(`Unauthorized access attempt: ${path}`);

    // Check if context.set exists before setting status
    if (context.set) {
      context.set.status = 401;
    }

    throw new Error("Authentication required. Please login.");
  }
  return context.user;
};

/**
 * Verifies that a user has one of the specified roles
 * @param {Array<string>} allowedRoles - Array of roles allowed to access the route
 * @returns {Function} - Middleware function that checks authentication and roles
 */
export const authorize = (allowedRoles = []) => {
  return (context) => {
    const user = requireAuth(context);

    // Security: Check if token is expired by validating exp claim
    const now = Math.floor(Date.now() / 1000);
    if (user.exp && user.exp < now) {
      logger.warn(`Expired token attempt: ${context.request?.url}`);
      if (context.set) {
        context.set.status = 401;
      }
      throw new Error("Authentication token has expired. Please login again.");
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      const path = new URL(context.request?.url || "unknown").pathname;
      logger.warn(`Forbidden access attempt by ${user.role} user to ${path}`);
      if (context.set) {
        context.set.status = 403;
      }
      throw new Error(
        `Access denied. ${allowedRoles.join(" or ")} role required.`
      );
    }

    return { user };
  };
};

/**
 * Checks if the authenticated user owns a resource or has admin privileges
 * @param {Object} user - The authenticated user
 * @param {string} resourceOwnerId - The ID of the resource owner
 * @returns {boolean} - True if user is owner or admin, false otherwise
 */
export const isOwnerOrAdmin = (user, resourceOwnerId) => {
  if (!user) return false;

  const isAdmin = user.role === "admin" || user.role === "superadmin";
  const isOwner = user.id === resourceOwnerId;

  return isAdmin || isOwner;
};

/**
 * Role-based authorization helper
 * Provides a consistent way to check for specific roles
 */
export const roles = {
  /**
   * Authorizes only admin or superadmin users
   */
  isAdmin: (context) => authorize(["admin", "superadmin"])(context),

  /**
   * Authorizes only superadmin users
   */
  isSuperAdmin: (context) => authorize(["superadmin"])(context),

  /**
   * Authorizes only supervisor users
   */
  isSupervisor: (context) => authorize(["supervisor"])(context),

  /**
   * Authorizes only student users
   */
  isStudent: (context) => authorize(["student"])(context),

  /**
   * Authorizes users who can manage projects (admin, superadmin, supervisor)
   */
  canManageProjects: (context) =>
    authorize(["admin", "superadmin", "supervisor"])(context),
};

/**
 * Get user role from context or null if not authenticated
 * @param {Object} context - The request context
 * @returns {string|null} - User role or null if not authenticated
 */
export const getUserRole = (context) => {
  return context.user?.role || null;
};

export default {
  requireAuth,
  authorize,
  isOwnerOrAdmin,
  roles,
  getUserRole,
};
