import { Elysia, t } from "elysia";
import {
  createProject,
  getAvailableSupervisors,
  getMyProjects,
  getProjectById,
  getProjectSubmissions,
  submitProject,
  submitProjectReport,
  updateProject,
} from "../controllers/projectController.js";
import logger from "../utils/logger.js";

// JWT configuration (Assuming secret is in process.env.JWT_SECRET)
/* // REMOVED: This config is now handled globally in src/index.js
const jwtConfig = {
  name: "jwt", // Name for the decorator, e.g., context.jwt
  secret: process.env.JWT_SECRET || "fallback-secret", // Ensure your secret is loaded
  // Optional: Specify where to find the token (e.g., cookie name)
  // cookie: 'auth' // Uncomment and set if using cookies
};
*/

// Create and export the Elysia instance directly
export const projectRoutes = new Elysia({ prefix: "/api/projects" })
  // REMOVED: .use(jwt(jwtConfig)) - JWT is now applied globally
  // REMOVED: .derive block - User derivation is now handled globally
  /*
  .derive(async ({ jwt, cookie, headers }) => {
    const tokenValue =
      cookie?.auth?.value || headers.authorization?.split(" ")[1];
    let user = null;
    if (tokenValue) {
      try {
        const profile = await jwt.verify(tokenValue);
        // Add a check for essential properties like userId
        if (profile && profile.userId) {
          user = profile;
          logger.debug(
            `JWT verified for user: ${user.userId}, role: ${user.role}`
          );
        } else {
          logger.warn("JWT verification succeeded but payload missing userId.");
        }
      } catch (error) {
        // Log verification errors (e.g., expired, invalid signature)
        logger.warn(`JWT verification failed: ${error.message}`);
      }
    } else {
      logger.debug("No auth cookie or Authorization header found.");
    }
    return { user }; // Add user (or null) to context
  })
  */
  // The global onRequest hook in src/index.js already handles authorization
  // Route handlers can now directly access context.user if authentication succeeded
  .get(
    "/",
    {
      detail: {
        summary: "Get all projects for the current user",
        tags: ["Projects"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: t.Object({
            success: t.Boolean(),
            data: t.Array(
              t.Object({
                _id: t.String(),
                name: t.String(),
                type: t.String(),
                description: t.String(),
                status: t.String(),
                team: t.Object({
                  _id: t.String(),
                  name: t.String(),
                }),
                supervisors: t.Array(
                  t.Object({
                    user: t.String(),
                    status: t.String(),
                  })
                ),
                milestones: t.Array(
                  t.Object({
                    title: t.String(),
                    description: t.String(),
                    dueDate: t.String(),
                    status: t.String(),
                  })
                ),
                createdAt: t.String(),
                updatedAt: t.String(),
              })
            ),
          }),
          401: { description: "Unauthorized" },
          404: { description: "Profile not found" },
        },
      },
    },
    async (context) => {
      try {
        // context.user is now populated by the global derive hook
        if (!context.user) {
          // This check might be redundant if the global onRequest handles it,
          // but can be kept for explicit route-level clarity or specific role checks.
          context.set.status = 401;
          return { success: false, error: "Unauthorized" };
        }
        logger.info("📚 Fetching user projects for user:", context.user.userId);
        const projects = await getMyProjects(context);
        return { success: true, data: projects };
      } catch (error) {
        logger.error("❌ Failed to fetch projects:", error);
        context.set.status = error.status || 500;
        return { success: false, error: error.message };
      }
    }
  )
  .post(
    "/",
    {
      body: t.Object({
        name: t.String({ minLength: 3 }),
        type: t.String({ enum: ["research", "project", "hybrid"] }),
        description: t.String({ minLength: 10 }),
        teamId: t.String(),
        category: t.String(),
        objectives: t.Array(t.String()),
        technologies: t.Array(t.String()),
        supervisorIds: t.Array(t.String(), { minItems: 1 }),
        timeline: t.Optional(
          t.Object({
            startDate: t.Optional(t.String({ format: "date-time" })),
            endDate: t.Optional(t.String({ format: "date-time" })),
            milestones: t.Optional(
              t.Array(
                t.Object({
                  title: t.String(),
                  description: t.String(),
                  dueDate: t.String({ format: "date-time" }),
                })
              )
            ),
          })
        ),
      }),
      detail: {
        summary: "Create a new project",
        tags: ["Projects"],
        security: [{ bearerAuth: [] }],
        responses: {
          201: t.Object({
            success: t.Boolean(),
            data: t.Object({
              _id: t.String(),
              name: t.String(),
              type: t.String(),
              description: t.String(),
              status: t.String(),
              team: t.Object({
                _id: t.String(),
                name: t.String(),
              }),
              supervisors: t.Array(
                t.Object({
                  supervisor: t.Object({
                    _id: t.String(),
                    name: t.String(),
                  }),
                  status: t.String(),
                })
              ),
              milestones: t.Array(
                t.Object({
                  title: t.String(),
                  description: t.String(),
                  dueDate: t.String(),
                  status: t.String(),
                })
              ),
              createdAt: t.String(),
              updatedAt: t.String(),
            }),
          }),
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden - not a team leader" },
          404: { description: "Team not found" },
        },
      },
    },
    async (context) => {
      try {
        // context.user is available here
        if (!context.user) {
          context.set.status = 401;
          return { success: false, error: "Unauthorized" };
        }
        logger.info("📝 Creating new project for user:", context.user.userId);
        const project = await createProject(context);
        context.set.status = 201;
        return { success: true, data: project };
      } catch (error) {
        logger.error("❌ Failed to create project:", error);
        context.set.status = error.status || 500;
        return { success: false, error: error.message };
      }
    }
  )
  .get(
    "/:id",
    {
      detail: {
        summary: "Get project details by ID",
        tags: ["Projects"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: t.Object({
            success: t.Boolean(),
            data: t.Object({
              _id: t.String(),
              name: t.String(),
              type: t.String(),
              description: t.String(),
              status: t.String(),
              team: t.Object({
                _id: t.String(),
                name: t.String(),
              }),
              supervisors: t.Array(
                t.Object({
                  user: t.String(),
                  status: t.String(),
                })
              ),
              milestones: t.Array(
                t.Object({
                  title: t.String(),
                  description: t.String(),
                  dueDate: t.String(),
                  status: t.String(),
                })
              ),
              createdAt: t.String(),
              updatedAt: t.String(),
            }),
          }),
          401: { description: "Unauthorized" },
          403: { description: "Forbidden - no access" },
          404: { description: "Project not found" },
        },
      },
    },
    async (context) => {
      try {
        logger.info("🔍 Fetching project details");
        const project = await getProjectById(context);
        return { success: true, data: project };
      } catch (error) {
        logger.error("❌ Failed to fetch project:", error);
        context.set.status = error.status || 500;
        return { success: false, error: error.message };
      }
    }
  )
  .patch(
    "/:id",
    {
      body: t.Object({
        name: t.Optional(t.String({ minLength: 3 })),
        type: t.Optional(t.String({ enum: ["research", "project"] })),
        description: t.Optional(t.String({ minLength: 10 })),
        objectives: t.Optional(t.Array(t.String())),
        technologies: t.Optional(t.Array(t.String())),
        supervisorIds: t.Optional(t.Array(t.String())),
        milestones: t.Optional(
          t.Array(
            t.Object({
              title: t.String(),
              description: t.String(),
              dueDate: t.String({ format: "date-time" }),
              status: t.String({
                enum: ["pending", "in_progress", "completed", "overdue"],
              }),
            })
          )
        ),
      }),
      detail: {
        summary: "Update project details",
        tags: ["Projects"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: t.Object({
            success: t.Boolean(),
            data: t.Object({
              _id: t.String(),
              name: t.String(),
              type: t.String(),
              description: t.String(),
              status: t.String(),
              team: t.Object({
                _id: t.String(),
                name: t.String(),
              }),
              supervisors: t.Array(
                t.Object({
                  user: t.String(),
                  status: t.String(),
                })
              ),
              milestones: t.Array(
                t.Object({
                  title: t.String(),
                  description: t.String(),
                  dueDate: t.String(),
                  status: t.String(),
                })
              ),
              createdAt: t.String(),
              updatedAt: t.String(),
            }),
          }),
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden - not authorized to update" },
          404: { description: "Project not found" },
        },
      },
    },
    async (context) => {
      try {
        logger.info("✏️ Updating project");
        const project = await updateProject(context);
        return { success: true, data: project };
      } catch (error) {
        logger.error("❌ Failed to update project:", error);
        context.set.status = error.status || 500;
        return { success: false, error: error.message };
      }
    }
  )
  .post(
    "/:id/submissions",
    {
      body: t.Object({
        title: t.String({ minLength: 3 }),
        fileUrl: t.String({ format: "uri" }),
        description: t.Optional(t.String()),
        deadlineId: t.Optional(t.String()),
      }),
      detail: {
        summary: "Submit project files",
        tags: ["Projects", "Submissions"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: t.Object({
            success: t.Boolean(),
            data: t.Object({
              _id: t.String(),
              title: t.String(),
              fileUrl: t.String(),
              submittedAt: t.String(),
            }),
          }),
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden - not a team member" },
          404: { description: "Project not found" },
        },
      },
    },
    async (context) => {
      try {
        logger.info("📤 Submitting project files");
        const submission = await submitProject(context);
        return { success: true, data: submission };
      } catch (error) {
        logger.error("❌ Failed to submit project:", error);
        context.set.status = error.status || 500;
        return { success: false, error: error.message };
      }
    }
  )
  .get(
    "/:id/submissions",
    {
      detail: {
        summary: "Get all submissions for a project",
        tags: ["Projects"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: t.Object({
            success: t.Boolean(),
            data: t.Array(
              t.Object({
                _id: t.String(),
                title: t.String(),
                fileUrl: t.String(),
                description: t.String(),
                submissionType: t.String(),
                submittedBy: t.Object({
                  _id: t.String(),
                  name: t.String(),
                }),
                submittedAt: t.String(),
                feedback: t.Optional(
                  t.Object({
                    content: t.String(),
                    givenBy: t.String(),
                    givenAt: t.String(),
                  })
                ),
                isLate: t.Optional(t.Boolean()),
                attachments: t.Optional(
                  t.Array(
                    t.Object({
                      name: t.String(),
                      fileUrl: t.String(),
                      fileType: t.String(),
                    })
                  )
                ),
              })
            ),
          }),
          401: { description: "Unauthorized" },
          403: { description: "Forbidden - no access to project" },
          404: { description: "Project not found" },
        },
      },
    },
    async (context) => {
      try {
        logger.info("📚 Fetching project submissions");
        const submissions = await getProjectSubmissions(context);
        return { success: true, data: submissions };
      } catch (error) {
        logger.error("❌ Failed to fetch submissions:", error);
        context.set.status = error.status || 500;
        return { success: false, error: error.message };
      }
    }
  )
  .post(
    "/:id/reports",
    {
      body: t.Object({
        title: t.String({ minLength: 3 }),
        description: t.String(),
        fileUrl: t.String({ minLength: 5 }),
        submissionType: t.String({
          enum: [
            "proposal",
            "progress_report",
            "final_report",
            "code",
            "presentation",
            "other",
          ],
        }),
        attachments: t.Optional(
          t.Array(
            t.Object({
              name: t.String(),
              fileUrl: t.String(),
              fileType: t.String(),
            })
          )
        ),
      }),
      detail: {
        summary: "Submit a project report",
        tags: ["Projects"],
        security: [{ bearerAuth: [] }],
        responses: {
          201: t.Object({
            success: t.Boolean(),
            data: t.Object({
              _id: t.String(),
              title: t.String(),
              description: t.String(),
              fileUrl: t.String(),
              submissionType: t.String(),
              submittedBy: t.String(),
              submittedAt: t.String(),
              status: t.String(),
            }),
          }),
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden - not a team member" },
          404: { description: "Project not found" },
        },
      },
    },
    async (context) => {
      try {
        logger.info("📝 Submitting project report");
        const submission = await submitProjectReport(context);
        context.set.status = 201;
        return { success: true, data: submission };
      } catch (error) {
        logger.error("❌ Failed to submit project report:", error);
        context.set.status = error.status || 500;
        return { success: false, error: error.message };
      }
    }
  )
  .get(
    "/supervisors/available",
    {
      detail: {
        summary: "Get available supervisors for project creation",
        tags: ["Projects"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: t.Object({
            success: t.Boolean(),
            data: t.Array(
              t.Object({
                _id: t.String(),
                name: t.String(),
                department: t.String(),
                expertise: t.Array(t.String()),
                maxProjects: t.Number(),
                currentProjects: t.Number(),
              })
            ),
          }),
          401: { description: "Unauthorized" },
        },
      },
    },
    async (context) => {
      try {
        logger.info("🔍 Fetching available supervisors");
        const supervisors = await getAvailableSupervisors(context);
        return { success: true, data: supervisors };
      } catch (error) {
        logger.error("❌ Failed to fetch supervisors:", error);
        context.set.status = error.status || 500;
        return { success: false, error: error.message };
      }
    }
  );

export default projectRoutes;
