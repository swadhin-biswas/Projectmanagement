/**
 * Route authentication utilities
 * Provides standardized functions to protect API routes with JWT authentication
 */

import { authorize } from "./authUtils.js";
import logger from "./logger.js";

/**
 * Protects all routes in a group with JWT authentication
 * Applies a middleware that requires a valid JWT token for all routes
 *
 * @param {Object} app - The Elysia app instance
 * @returns {Object} - The app instance with authentication middleware
 */
export const protectRoutes = (app) => {
  app.derive(({ request }) => {
    logger.debug(`Protecting route: ${request.url}`);
    return authorize()({ request });
  });
  return app;
};

/**
 * Protects all routes in a group with role-based authentication
 *
 * @param {Object} app - The Elysia app instance
 * @param {Array<string>} allowedRoles - The roles allowed to access these routes
 * @returns {Object} - The app instance with role-based authentication middleware
 */
export const protectRoutesByRole = (app, allowedRoles) => {
  app.derive(({ request }) => {
    logger.debug(
      `Protecting route with roles ${allowedRoles.join(", ")}: ${request.url}`
    );
    return authorize(allowedRoles)({ request });
  });
  return app;
};

/**
 * Middleware factories for common role-based protections
 */
export const routeProtection = {
  /**
   * Protects routes for admin access only
   */
  adminOnly: (app) => protectRoutesByRole(app, ["admin", "superadmin"]),

  /**
   * Protects routes for superadmin access only
   */
  superAdminOnly: (app) => protectRoutesByRole(app, ["superadmin"]),

  /**
   * Protects routes for supervisor access only
   */
  supervisorOnly: (app) => protectRoutesByRole(app, ["supervisor"]),

  /**
   * Protects routes for student access only
   */
  studentOnly: (app) => protectRoutesByRole(app, ["student"]),

  /**
   * Requires authentication but allows any role
   */
  requireAuth: protectRoutes,

  /**
   * Apply the appropriate role protection based on the route type
   */
  byRole: (role) => {
    switch (role) {
      case "admin":
        return routeProtection.adminOnly;
      case "superadmin":
        return routeProtection.superAdminOnly;
      case "supervisor":
        return routeProtection.supervisorOnly;
      case "student":
        return routeProtection.studentOnly;
      default:
        return routeProtection.requireAuth;
    }
  },
};

export default routeProtection;
