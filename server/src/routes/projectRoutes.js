import { Elysia, t } from "elysia";
import {
  createProject,
  getMyProjects,
  getProjectById,
  getProjectSubmissions,
  submitProject,
  updateProject,
} from "../controllers/projectController.js";
import { authorize } from "../middleware/auth.js";
import logger from "../utils/logger.js";

// Create and export the Elysia instance directly
export const projectRoutes = new Elysia({ prefix: "/api/projects" })
  .get("/", {
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
    }
  }, async (context) => {
    try {
      logger.info("📚 Fetching user projects");
      const { user } = await authorize(["student", "supervisor"])(context);
      const projects = await getMyProjects({ ...context, user });
      return { success: true, data: projects };
    } catch (error) {
      logger.error("❌ Failed to fetch projects:", error);
      context.set.status = error.status || 500;
      return { success: false, error: error.message };
    }
  })
  .post("/", {
    body: t.Object({
      name: t.String({ minLength: 3 }),
      type: t.String({ enum: ["research", "project"] }),
      description: t.String({ minLength: 10 }),
      teamId: t.String(),
      objectives: t.Array(t.String()),
      technologies: t.Array(t.String()),
      supervisorIds: t.Array(t.String()),
      milestones: t.Array(
        t.Object({
          title: t.String(),
          description: t.String(),
          dueDate: t.String({ format: "date-time" }),
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
        403: { description: "Forbidden - not a team leader" },
        404: { description: "Team not found" },
      },
    },
  }, async (context) => {
    try {
      logger.info("📝 Creating new project");
      const { user } = await authorize(["student"])(context);
      const project = await createProject({ ...context, user });
      context.set.status = 201;
      return { success: true, data: project };
    } catch (error) {
      logger.error("❌ Failed to create project:", error);
      context.set.status = error.status || 500;
      return { success: false, error: error.message };
    }
  })
  .get("/:id", {
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
  }, async (context) => {
    try {
      logger.info("🔍 Fetching project details");
      const { user } = await authorize(["student", "supervisor", "admin"])(
        context
      );
      const project = await getProjectById({ ...context, user });
      return { success: true, data: project };
    } catch (error) {
      logger.error("❌ Failed to fetch project:", error);
      context.set.status = error.status || 500;
      return { success: false, error: error.message };
    }
  })
  .patch("/:id", {
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
  }, async (context) => {
    try {
      logger.info("✏️ Updating project");
      const { user } = await authorize(["student"])(context);
      const project = await updateProject({ ...context, user });
      return { success: true, data: project };
    } catch (error) {
      logger.error("❌ Failed to update project:", error);
      context.set.status = error.status || 500;
      return { success: false, error: error.message };
    }
  })
  .post("/:id/submissions", {
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
  }, async (context) => {
    try {
      logger.info("📤 Submitting project files");
      const { user } = await authorize(["student"])(context);
      const submission = await submitProject({ ...context, user });
      return { success: true, data: submission };
    } catch (error) {
      logger.error("❌ Failed to submit project:", error);
      context.set.status = error.status || 500;
      return { success: false, error: error.message };
    }
  })
  .get("/:id/submissions", {
    detail: {
      summary: "Get project submissions",
      tags: ["Projects", "Submissions"],
      security: [{ bearerAuth: [] }],
      responses: {
        200: t.Object({
          success: t.Boolean(),
          data: t.Array(
            t.Object({
              _id: t.String(),
              title: t.String(),
              fileUrl: t.String(),
              submittedAt: t.String(),
              submittedBy: t.Object({
                _id: t.String(),
                fullName: t.String(),
              }),
            })
          ),
        }),
        401: { description: "Unauthorized" },
        403: { description: "Forbidden - no access" },
        404: { description: "Project not found" },
      },
    },
  }, async (context) => {
    try {
      logger.info("📋 Fetching project submissions");
      const { user } = await authorize(["student", "supervisor", "admin"])(
        context
      );
      const submissions = await getProjectSubmissions({ ...context, user });
      return { success: true, data: submissions };
    } catch (error) {
      logger.error("❌ Failed to fetch submissions:", error);
      context.set.status = error.status || 500;
      return { success: false, error: error.message };
    }
  });

export default projectRoutes;
