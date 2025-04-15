/**
 * Route authentication utilities
 * Provides standardized functions to protect API routes with JWT authentication
 */

/**
 * Helper function to protect routes based on role
 */
function protectRoutesByRole(app, allowedRoles = []) {
  app.derive(({ user, set, request }) => {
    // Log authentication data for debugging
    const path = request?.url ? new URL(request.url).pathname : "unknown";

    if (!user) {
      console.debug(`No user found in context for path: ${path}`);
      set.status = 401;
      throw new Error("Authentication required. Please login.");
    }

    console.debug(
      `Protecting route with roles ${allowedRoles.join(", ")}: ${path}`
    );

    // Check if the user has an allowed role
    if (!allowedRoles.includes(user.role)) {
      console.warn(`Forbidden access attempt by ${user.role} user to ${path}`);
      set.status = 403;
      throw new Error(
        `Access denied. ${allowedRoles.join(" or ")} role required.`
      );
    }

    // User is authenticated and has an allowed role
    return { user };
  });

  return app;
}

/**
 * Helper function to protect routes without role checking
 */
function protectRoutes(app) {
  app.derive(({ user, set, request }) => {
    const path = request?.url ? new URL(request.url).pathname : "unknown";

    if (!user) {
      console.debug(`No user found in context for path: ${path}`);
      set.status = 401;
      throw new Error("Authentication required. Please login.");
    }

    // User is authenticated
    return { user };
  });

  return app;
}

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
