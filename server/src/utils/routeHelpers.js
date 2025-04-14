import logger from "./logger.js";

/**
 * Creates handler functions for redirecting root-level routes to API routes
 * This helps with backward compatibility for clients expecting routes at root level
 *
 * @param {string} path - The path to redirect (without /api prefix)
 * @param {string} method - HTTP method (default: 'GET')
 * @returns {Function} - Handler function for Elysia routes
 */
export const createApiRedirectHandler = (path, method = "GET") => {
  return ({ set, headers, query, params, body, method: requestMethod }) => {
    // Check for valid authorization
    const authHeader = headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      logger.warn(
        `Unauthorized access attempt (no/invalid Authorization header): ${method} ${path}`
      );
      set.status = 401;
      return {
        success: false,
        error: "Authentication required",
        code: "UNAUTHORIZED",
      };
    }

    // Redirect to the API endpoint with the same auth token
    const apiPath = `/api${path}`;
    logger.debug(`Redirecting request from ${path} to ${apiPath}`);

    // For GET requests, we can use redirect
    if (method === "GET") {
      set.redirect = apiPath;
      return;
    }

    // For other methods, we need to proxy the request (not directly supported in Elysia)
    // Return a message instructing to use the API endpoint instead
    set.status = 308; // Permanent Redirect
    set.headers = {
      ...set.headers,
      Location: apiPath,
    };

    return {
      success: false,
      error: `This endpoint has moved to ${apiPath}. Please update your client to use the new URL.`,
      code: "ENDPOINT_MOVED",
    };
  };
};

/**
 * Creates handler functions for redirecting team routes to student team routes
 * This specifically handles redirects from /teams/* to /api/students/team/*
 *
 * @param {string} path - The original team path
 * @param {string} method - HTTP method (default: 'GET')
 * @returns {Function} - Handler function for Elysia routes
 */
export const createTeamRedirectHandler = (path, method = "GET") => {
  return ({ set, headers, query, params, body, method: requestMethod }) => {
    // Check for valid authorization
    const authHeader = headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      logger.warn(
        `Unauthorized access attempt (no/invalid Authorization header): ${method} ${path}`
      );
      set.status = 401;
      return {
        success: false,
        error: "Authentication required",
        code: "UNAUTHORIZED",
      };
    }

    // Map the team routes to student team routes
    let studentTeamPath;

    // Handle specific path mappings
    if (path === "/teams") {
      studentTeamPath = "/api/students/team";
    } else if (path === "/teams/my-team") {
      studentTeamPath = "/api/students/team";
    } else if (path.includes("/teams/") && path.includes("/invite")) {
      studentTeamPath = "/api/students/team/invite";
    } else if (path.includes("/teams/") && path.includes("/leave")) {
      studentTeamPath = "/api/students/team/leave-team";
    } else if (path.includes("/teams/") && path.includes("/remove-member")) {
      studentTeamPath = "/api/students/team/remove-member";
    } else {
      // Default fallback
      studentTeamPath = "/api/students/team";
    }

    logger.debug(`Redirecting team request from ${path} to ${studentTeamPath}`);

    // For GET requests, we can use redirect
    if (method === "GET") {
      set.redirect = studentTeamPath;
      return;
    }

    // For other methods, we need to proxy the request (not directly supported in Elysia)
    // Return a message instructing to use the student team endpoint instead
    set.status = 308; // Permanent Redirect
    set.headers = {
      ...set.headers,
      Location: studentTeamPath,
    };

    return {
      success: false,
      error: `This endpoint has moved to ${studentTeamPath}. Please update your client to use the new URL.`,
      code: "ENDPOINT_MOVED",
    };
  };
};

/**
 * Creates handler functions for redirecting student-team routes to student team routes
 * This specifically handles redirects from /api/student-teams/* to /api/students/team/*
 *
 * @param {string} path - The original student-team path
 * @param {string} method - HTTP method (default: 'GET')
 * @returns {Function} - Handler function for Elysia routes
 */
export const createStudentTeamRedirectHandler = (path, method = "GET") => {
  return ({ set, headers, query, params, body, method: requestMethod }) => {
    // Check for valid authorization
    const authHeader = headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      logger.warn(
        `Unauthorized access attempt (no/invalid Authorization header): ${method} ${path}`
      );
      set.status = 401;
      return {
        success: false,
        error: "Authentication required",
        code: "UNAUTHORIZED",
      };
    }

    // Map the student-team routes to student team routes
    let studentTeamPath;

    // Handle specific path mappings
    if (path === "/api/student-teams") {
      studentTeamPath = "/api/students/team";
    } else if (path === "/api/student-teams/invitations") {
      studentTeamPath = "/api/students/team/invitations";
    } else if (
      path.includes("/api/student-teams/") &&
      path.includes("/leave")
    ) {
      studentTeamPath = "/api/students/team/leave-team";
    } else {
      // Default fallback
      studentTeamPath = "/api/students/team";
    }

    logger.debug(
      `Redirecting student-team request from ${path} to ${studentTeamPath}`
    );

    // For GET requests, we can use redirect
    if (method === "GET") {
      set.redirect = studentTeamPath;
      return;
    }

    // For other methods, we need to proxy the request (not directly supported in Elysia)
    // Return a message instructing to use the student team endpoint instead
    set.status = 308; // Permanent Redirect
    set.headers = {
      ...set.headers,
      Location: studentTeamPath,
    };

    return {
      success: false,
      error: `This endpoint has moved to ${studentTeamPath}. Please update your client to use the new URL.`,
      code: "ENDPOINT_MOVED",
    };
  };
};

/**
 * Registers redirect routes from root level to API for backward compatibility
 *
 * @param {Elysia} app - The Elysia app instance
 * @param {Array<string|Object>} routes - Array of routes to redirect
 *                                       Can be strings for GET routes or objects with path and methods
 *                                       Example: ['/users', { path: '/projects', methods: ['GET', 'POST'] }]
 */
export const registerApiRedirects = (app, routes) => {
  routes.forEach((route) => {
    if (typeof route === "string") {
      // Simple GET route
      // Use the right handler based on the route type
      if (route.startsWith("/teams")) {
        app.get(route, createTeamRedirectHandler(route, "GET"));
        logger.info(
          `Registered Team API redirect from GET ${route} to GET /api/students/team/...`
        );
      } else if (route.startsWith("/api/student-teams")) {
        app.get(route, createStudentTeamRedirectHandler(route, "GET"));
        logger.info(
          `Registered Student Team API redirect from GET ${route} to GET /api/students/team/...`
        );
      } else {
        app.get(route, createApiRedirectHandler(route, "GET"));
        logger.info(
          `Registered API redirect from GET ${route} to GET /api${route}`
        );
      }
    } else if (typeof route === "object" && route.path) {
      // Object with path and optional methods
      const methods = route.methods || ["GET"];
      methods.forEach((method) => {
        const methodLower = method.toLowerCase();
        if (app[methodLower]) {
          // Use the right handler based on the route type
          if (route.path.startsWith("/teams")) {
            app[methodLower](
              route.path,
              createTeamRedirectHandler(route.path, method)
            );
            logger.info(
              `Registered Team API redirect from ${method} ${route.path} to ${method} /api/students/team/...`
            );
          } else if (route.path.startsWith("/api/student-teams")) {
            app[methodLower](
              route.path,
              createStudentTeamRedirectHandler(route.path, method)
            );
            logger.info(
              `Registered Student Team API redirect from ${method} ${route.path} to ${method} /api/students/team/...`
            );
          } else {
            app[methodLower](
              route.path,
              createApiRedirectHandler(route.path, method)
            );
            logger.info(
              `Registered API redirect from ${method} ${route.path} to ${method} /api${route.path}`
            );
          }
        } else {
          logger.warn(`Skipping unsupported HTTP method: ${method}`);
        }
      });
    }
  });
};
