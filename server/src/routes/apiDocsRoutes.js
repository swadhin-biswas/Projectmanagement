import { promises as fs } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import logger from "../utils/logger.js";

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Routes for API documentation and landing page
 */
export default function apiDocsRoutes(app) {
  return app.group("/api-docs", (app) => {
    return app
      .get(
        "/",
        {
          detail: {
            summary: "API Documentation Home",
            tags: ["Documentation"],
            description:
              "Landing page for API documentation with all available routes",
          },
        },
        async ({ set }) => {
          logger.info("📚 Serving API documentation landing page");

          try {
            // Path to the documentation HTML file
            const docPath = join(
              __dirname,
              "..",
              "static",
              "documentation.html"
            );

            // Read the HTML file
            const htmlContent = await fs.readFile(docPath, "utf8");

            // Set response headers
            set.headers["Content-Type"] = "text/html";

            // Return the HTML content directly
            return htmlContent;
          } catch (error) {
            logger.error("❌ Error serving documentation page:", error);

            // Fall back to JSON if HTML file is not found
            // Organize routes by their domain
            const routes = {
              auth: [
                {
                  path: "/auth/register",
                  method: "POST",
                  description: "Register a new user",
                },
                {
                  path: "/auth/login",
                  method: "POST",
                  description: "Log in an existing user",
                },
                {
                  path: "/auth/profile",
                  method: "GET",
                  description: "Get the user's profile",
                },
                {
                  path: "/auth/profile",
                  method: "PUT",
                  description: "Update the user's profile",
                },
                {
                  path: "/auth/verify-email/:token",
                  method: "POST",
                  description: "Verify email address",
                },
                {
                  path: "/auth/reset-password-request",
                  method: "POST",
                  description: "Request password reset",
                },
                {
                  path: "/auth/reset-password/:token",
                  method: "POST",
                  description: "Reset password with token",
                },
              ],
              dashboard: [
                {
                  path: "/dashboard/student",
                  method: "GET",
                  description: "Get student dashboard data",
                },
                {
                  path: "/dashboard/supervisor",
                  method: "GET",
                  description: "Get supervisor dashboard data",
                },
                {
                  path: "/dashboard/admin",
                  method: "GET",
                  description: "Get admin dashboard data",
                },
              ],
              sessions: [
                {
                  path: "/sessions",
                  method: "GET",
                  description: "Get all sessions",
                },
                {
                  path: "/sessions/current",
                  method: "GET",
                  description: "Get current active session",
                },
                {
                  path: "/sessions",
                  method: "POST",
                  description: "Create a new session",
                },
                {
                  path: "/sessions/:id",
                  method: "PATCH",
                  description: "Update a session",
                },
              ],
              students: [
                {
                  path: "/students/profile",
                  method: "GET",
                  description: "Get student profile",
                },
                {
                  path: "/students/deadlines",
                  method: "GET",
                  description: "Get deadlines for student",
                },
                {
                  path: "/students/submit-report",
                  method: "POST",
                  description: "Submit a report",
                },
                {
                  path: "/students/messages",
                  method: "GET",
                  description: "Get student messages",
                },
                {
                  path: "/students/messages/:messageId/read",
                  method: "PUT",
                  description: "Mark message as read",
                },
                {
                  path: "/students/results",
                  method: "GET",
                  description: "Get all student results",
                },
                {
                  path: "/students/results/:resultId",
                  method: "GET",
                  description: "Get detailed result view",
                },
              ],
              supervisors: [
                {
                  path: "/supervisor/profile",
                  method: "GET",
                  description: "Get supervisor profile",
                },
                {
                  path: "/supervisor/profile",
                  method: "PUT",
                  description: "Update supervisor profile",
                },
                {
                  path: "/supervisor/projects",
                  method: "GET",
                  description: "Get supervised projects",
                },
                {
                  path: "/supervisor/projects/requests",
                  method: "GET",
                  description: "Get project supervision requests",
                },
                {
                  path: "/supervisor/projects/:projectId/evaluate",
                  method: "POST",
                  description: "Evaluate project",
                },
                {
                  path: "/supervisor/teams",
                  method: "GET",
                  description: "Get supervised teams",
                },
                {
                  path: "/supervisor/teams/:teamId/feedback",
                  method: "POST",
                  description: "Provide feedback to team",
                },
                {
                  path: "/supervisor/teams/:teamId/consultations",
                  method: "POST",
                  description: "Schedule team consultation",
                },
              ],
              admin: [
                {
                  path: "/admin/users",
                  method: "GET",
                  description: "Get all users",
                },
                {
                  path: "/admin/pending-supervisors",
                  method: "GET",
                  description: "Get pending supervisor approvals",
                },
                {
                  path: "/admin/approve-supervisor/:id",
                  method: "PUT",
                  description: "Approve supervisor",
                },
                {
                  path: "/admin/users/:id",
                  method: "DELETE",
                  description: "Delete user",
                },
                {
                  path: "/admin/analytics",
                  method: "GET",
                  description: "Get system analytics",
                },
                {
                  path: "/admin/supervisors",
                  method: "GET",
                  description: "Get all supervisors with stats",
                },
                {
                  path: "/admin/supervisors/:id/approve",
                  method: "POST",
                  description: "Approve supervisor account",
                },
                {
                  path: "/admin/supervisors/:id/performance",
                  method: "GET",
                  description: "Get supervisor performance metrics",
                },
                {
                  path: "/admin/supervisors/:id/activity",
                  method: "GET",
                  description: "Get supervisor activity log",
                },
                {
                  path: "/admin/supervisors/:id/progress-tracking",
                  method: "GET",
                  description: "Verify supervisor progress tracking",
                },
                {
                  path: "/admin/supervisors/:id/marking-activity",
                  method: "GET",
                  description: "Review supervisor marking activity",
                },
                {
                  path: "/admin/supervisors/:id/fix",
                  method: "POST",
                  description: "Fix supervisor functionality",
                },
                {
                  path: "/admin/supervisors/:id/configuration",
                  method: "PUT",
                  description: "Update supervisor configuration",
                },
                {
                  path: "/admin/teams/:teamId/assign-supervisor",
                  method: "POST",
                  description: "Assign supervisor to team",
                },
                {
                  path: "/admin/teams",
                  method: "GET",
                  description: "Get all teams with detailed info",
                },
                {
                  path: "/admin/projects",
                  method: "GET",
                  description: "Get all projects with detailed info",
                },
                {
                  path: "/admin/students",
                  method: "GET",
                  description: "Get all students with detailed info",
                },
              ],
              system: [
                {
                  path: "/api",
                  method: "GET",
                  description: "API Status Check",
                },
                {
                  path: "/api/health/db",
                  method: "GET",
                  description: "Database Health Check",
                },
                {
                  path: "/api-docs",
                  method: "GET",
                  description: "API Documentation (this page)",
                },
              ],
            };

            // Return formatted documentation
            return {
              success: true,
              data: {
                title: "Research Project Management API",
                version: "1.0.0",
                baseUrl: process.env.API_URL || "http://localhost:3000",
                description:
                  "API documentation for the Research Project Management System",
                categories: Object.keys(routes).map((category) => ({
                  name: category.charAt(0).toUpperCase() + category.slice(1),
                  endpoints: routes[category],
                })),
                endpointCount: Object.values(routes).reduce(
                  (count, endpoints) => count + endpoints.length,
                  0
                ),
                timestamp: new Date().toISOString(),
                error:
                  "HTML documentation not available, falling back to JSON format",
              },
            };
          }
        }
      )

      .get(
        "/json",
        {
          detail: {
            summary: "API Documentation in JSON format",
            tags: ["Documentation"],
            description:
              "JSON format documentation of all available API routes",
          },
        },
        async () => {
          logger.info("📚 Fetching API documentation in JSON format");

          // Organize routes by their domain
          const routes = {
            auth: [
              {
                path: "/auth/register",
                method: "POST",
                description: "Register a new user",
              },
              {
                path: "/auth/login",
                method: "POST",
                description: "Log in an existing user",
              },
              {
                path: "/auth/profile",
                method: "GET",
                description: "Get the user's profile",
              },
              {
                path: "/auth/profile",
                method: "PUT",
                description: "Update the user's profile",
              },
              {
                path: "/auth/verify-email/:token",
                method: "POST",
                description: "Verify email address",
              },
              {
                path: "/auth/reset-password-request",
                method: "POST",
                description: "Request password reset",
              },
              {
                path: "/auth/reset-password/:token",
                method: "POST",
                description: "Reset password with token",
              },
            ],
            dashboard: [
              {
                path: "/dashboard/student",
                method: "GET",
                description: "Get student dashboard data",
              },
              {
                path: "/dashboard/supervisor",
                method: "GET",
                description: "Get supervisor dashboard data",
              },
              {
                path: "/dashboard/admin",
                method: "GET",
                description: "Get admin dashboard data",
              },
            ],
            sessions: [
              {
                path: "/sessions",
                method: "GET",
                description: "Get all sessions",
              },
              {
                path: "/sessions/current",
                method: "GET",
                description: "Get current active session",
              },
              {
                path: "/sessions",
                method: "POST",
                description: "Create a new session",
              },
              {
                path: "/sessions/:id",
                method: "PATCH",
                description: "Update a session",
              },
            ],
            students: [
              {
                path: "/students/profile",
                method: "GET",
                description: "Get student profile",
              },
              {
                path: "/students/deadlines",
                method: "GET",
                description: "Get deadlines for student",
              },
              {
                path: "/students/submit-report",
                method: "POST",
                description: "Submit a report",
              },
              {
                path: "/students/messages",
                method: "GET",
                description: "Get student messages",
              },
              {
                path: "/students/messages/:messageId/read",
                method: "PUT",
                description: "Mark message as read",
              },
              {
                path: "/students/results",
                method: "GET",
                description: "Get all student results",
              },
              {
                path: "/students/results/:resultId",
                method: "GET",
                description: "Get detailed result view",
              },
            ],
            supervisors: [
              {
                path: "/supervisor/profile",
                method: "GET",
                description: "Get supervisor profile",
              },
              {
                path: "/supervisor/profile",
                method: "PUT",
                description: "Update supervisor profile",
              },
              {
                path: "/supervisor/projects",
                method: "GET",
                description: "Get supervised projects",
              },
              {
                path: "/supervisor/projects/requests",
                method: "GET",
                description: "Get project supervision requests",
              },
              {
                path: "/supervisor/projects/:projectId/evaluate",
                method: "POST",
                description: "Evaluate project",
              },
              {
                path: "/supervisor/teams",
                method: "GET",
                description: "Get supervised teams",
              },
              {
                path: "/supervisor/teams/:teamId/feedback",
                method: "POST",
                description: "Provide feedback to team",
              },
              {
                path: "/supervisor/teams/:teamId/consultations",
                method: "POST",
                description: "Schedule team consultation",
              },
            ],
            admin: [
              {
                path: "/admin/users",
                method: "GET",
                description: "Get all users",
              },
              {
                path: "/admin/pending-supervisors",
                method: "GET",
                description: "Get pending supervisor approvals",
              },
              {
                path: "/admin/approve-supervisor/:id",
                method: "PUT",
                description: "Approve supervisor",
              },
              {
                path: "/admin/users/:id",
                method: "DELETE",
                description: "Delete user",
              },
              {
                path: "/admin/analytics",
                method: "GET",
                description: "Get system analytics",
              },
              {
                path: "/admin/supervisors",
                method: "GET",
                description: "Get all supervisors with stats",
              },
              {
                path: "/admin/supervisors/:id/approve",
                method: "POST",
                description: "Approve supervisor account",
              },
              {
                path: "/admin/supervisors/:id/performance",
                method: "GET",
                description: "Get supervisor performance metrics",
              },
              {
                path: "/admin/supervisors/:id/activity",
                method: "GET",
                description: "Get supervisor activity log",
              },
              {
                path: "/admin/supervisors/:id/progress-tracking",
                method: "GET",
                description: "Verify supervisor progress tracking",
              },
              {
                path: "/admin/supervisors/:id/marking-activity",
                method: "GET",
                description: "Review supervisor marking activity",
              },
              {
                path: "/admin/supervisors/:id/fix",
                method: "POST",
                description: "Fix supervisor functionality",
              },
              {
                path: "/admin/supervisors/:id/configuration",
                method: "PUT",
                description: "Update supervisor configuration",
              },
              {
                path: "/admin/teams/:teamId/assign-supervisor",
                method: "POST",
                description: "Assign supervisor to team",
              },
              {
                path: "/admin/teams",
                method: "GET",
                description: "Get all teams with detailed info",
              },
              {
                path: "/admin/projects",
                method: "GET",
                description: "Get all projects with detailed info",
              },
              {
                path: "/admin/students",
                method: "GET",
                description: "Get all students with detailed info",
              },
            ],
            system: [
              { path: "/api", method: "GET", description: "API Status Check" },
              {
                path: "/api/health/db",
                method: "GET",
                description: "Database Health Check",
              },
              {
                path: "/api-docs",
                method: "GET",
                description: "API Documentation (this page)",
              },
            ],
          };

          // Return formatted documentation
          return {
            success: true,
            data: {
              title: "Research Project Management API",
              version: "1.0.0",
              baseUrl: process.env.API_URL || "http://localhost:3000",
              description:
                "API documentation for the Research Project Management System",
              categories: Object.keys(routes).map((category) => ({
                name: category.charAt(0).toUpperCase() + category.slice(1),
                endpoints: routes[category],
              })),
              endpointCount: Object.values(routes).reduce(
                (count, endpoints) => count + endpoints.length,
                0
              ),
              timestamp: new Date().toISOString(),
            },
          };
        }
      )

      .get(
        "/swagger",
        {
          detail: {
            summary: "Redirect to Swagger UI",
            tags: ["Documentation"],
            description: "Redirects to the Swagger UI documentation",
          },
        },
        ({ set }) => {
          set.redirect = "/swagger";
          return { success: true, message: "Redirecting to Swagger UI" };
        }
      );
  });
}
