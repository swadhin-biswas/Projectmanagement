import { t } from "elysia";
import {
  approveSupervisor,
  assignSupervisorToTeam,
  fixSupervisorFunctionality,
  getProjects,
  getStudents,
  getSupervisorActivity,
  getSupervisorPerformance,
  getSupervisors,
  getSystemAnalytics,
  getTeams,
  reviewSupervisorMarkingActivity,
  updateSupervisorConfiguration,
  verifySupervisorProgressTracking,
} from "../controllers/adminController.js";
import { authorize } from "../middleware/auth.js";
import { ValidationError } from "../utils/errors.js";

const userSchema = t.Object({
  _id: t.String(),
  fullName: t.String(),
  email: t.String(),
  role: t.String(),
  department: t.String(),
  isApproved: t.Boolean(),
  createdAt: t.String(),
});

const usersResponse = t.Array(userSchema);

const successResponse = t.Object({
  message: t.String(),
  user: t.Optional(userSchema),
});

const errorResponse = t.Object({
  error: t.Boolean(),
  message: t.String(),
});

export default function adminRoutes(app) {
  app.derive(({ user, set, skipAuth }) => {
    // Skip authentication check if the skipAuth flag is set
    if (skipAuth) {
      return { user };
    }

    if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
      set.status = 403;
      throw new ValidationError("Only administrators can access this resource");
    }
    return { user };
  });

  app.get(
    "/users",
    {
      response: {
        200: usersResponse,
        403: errorResponse,
        500: errorResponse,
      },
      detail: {
        tags: ["Admin"],
        summary: "Get all users",
        description:
          "Retrieves a list of all users in the system. Admin access only.",
        security: [{ bearerAuth: [] }],
      },
    },
    async () => {
      const users = await adminController.getUsers();
      return users;
    }
  );

  app.get(
    "/pending-supervisors",
    {
      response: {
        200: usersResponse,
        403: errorResponse,
        500: errorResponse,
      },
      detail: {
        tags: ["Admin"],
        summary: "Get pending supervisor approvals",
        description:
          "Retrieves a list of supervisor accounts waiting for approval. Admin access only.",
        security: [{ bearerAuth: [] }],
      },
    },
    async () => {
      const pendingSupervisors = await adminController.getPendingSupervisors();
      return pendingSupervisors;
    }
  );

  app.put(
    "/approve-supervisor/:id",
    {
      params: t.Object({
        id: t.String(),
      }),
      response: {
        200: successResponse,
        400: errorResponse,
        403: errorResponse,
        404: errorResponse,
        500: errorResponse,
      },
      detail: {
        tags: ["Admin"],
        summary: "Approve supervisor",
        description:
          "Approves a pending supervisor account. Admin access only.",
        security: [{ bearerAuth: [] }],
      },
    },
    async ({ params }) => {
      const result = await adminController.approveSupervisor(params.id);
      return result;
    }
  );

  app.delete(
    "/users/:id",
    {
      params: t.Object({
        id: t.String(),
      }),
      response: {
        200: t.Object({ message: t.String() }),
        403: errorResponse,
        404: errorResponse,
        500: errorResponse,
      },
      detail: {
        tags: ["Admin"],
        summary: "Delete user",
        description:
          "Permanently removes a user from the system. Admin access only.",
        security: [{ bearerAuth: [] }],
      },
    },
    async ({ params }) => {
      const result = await adminController.deleteUser(params.id);
      return result;
    }
  );

  return app
    .get(
      "/analytics",
      {
        detail: {
          summary: "Get system analytics and overview",
          tags: ["Admin", "Analytics"],
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "System analytics" },
            401: { description: "Unauthorized" },
          },
        },
      },
      async (context) => {
        await authorize(["admin", "super_admin"])(context);
        return getSystemAnalytics(context);
      }
    )
    .get(
      "/supervisors",
      {
        query: {
          type: "object",
          properties: {
            page: { type: "number", default: 1 },
            limit: { type: "number", default: 10 },
            sort: { type: "string" },
            sessionId: { type: "string" },
          },
        },
        detail: {
          summary: "Get all supervisors with assignment stats",
          tags: ["Admin", "Supervisors"],
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "List of supervisors with stats" },
            401: { description: "Unauthorized" },
          },
        },
      },
      async (context) => {
        await authorize(["admin", "super_admin"])(context);
        return getSupervisors(context);
      }
    )
    .post(
      "/supervisors/:id/approve",
      {
        detail: {
          summary: "Approve supervisor account",
          tags: ["Admin", "Supervisors"],
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "Supervisor approved successfully" },
            400: { description: "Validation error - already approved" },
            401: { description: "Unauthorized" },
            404: { description: "Supervisor not found" },
          },
        },
      },
      async (context) => {
        await authorize(["admin", "super_admin"])(context);
        return approveSupervisor(context);
      }
    )
    .get(
      "/supervisors/:id/performance",
      {
        detail: {
          summary: "Get supervisor performance metrics",
          tags: ["Admin", "Supervisors"],
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "Supervisor performance metrics" },
            401: { description: "Unauthorized" },
            404: { description: "Supervisor not found" },
          },
        },
      },
      async (context) => {
        await authorize(["admin", "super_admin"])(context);
        return getSupervisorPerformance(context);
      }
    )
    .get(
      "/supervisors/:id/activity",
      {
        query: {
          type: "object",
          properties: {
            limit: { type: "number", default: 50 },
          },
        },
        detail: {
          summary: "Get supervisor activity log",
          tags: ["Admin", "Supervisors"],
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "Supervisor activity log" },
            401: { description: "Unauthorized" },
            404: { description: "Supervisor not found" },
          },
        },
      },
      async (context) => {
        await authorize(["admin", "super_admin"])(context);
        return getSupervisorActivity(context);
      }
    )
    .get(
      "/supervisors/:id/progress-tracking",
      {
        detail: {
          summary: "Verify supervisor progress tracking",
          tags: ["Admin", "Supervisors"],
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "Supervisor progress tracking verification" },
            401: { description: "Unauthorized" },
            404: { description: "Supervisor not found" },
          },
        },
      },
      async (context) => {
        await authorize(["admin", "super_admin"])(context);
        return verifySupervisorProgressTracking(context);
      }
    )
    .get(
      "/supervisors/:id/marking-activity",
      {
        detail: {
          summary: "Review supervisor marking activity",
          tags: ["Admin", "Supervisors"],
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "Supervisor marking activity review" },
            401: { description: "Unauthorized" },
            404: { description: "Supervisor not found" },
          },
        },
      },
      async (context) => {
        await authorize(["admin", "super_admin"])(context);
        return reviewSupervisorMarkingActivity(context);
      }
    )
    .post(
      "/supervisors/:id/fix",
      {
        body: {
          type: "object",
          properties: {
            action: {
              type: "string",
              enum: [
                "initialize_progress_tracking",
                "fix_missing_marks",
                "add_meeting_template",
              ],
            },
            adminId: { type: "string" },
          },
          required: ["action"],
        },
        detail: {
          summary: "Fix missing or incomplete supervisor functionality",
          tags: ["Admin", "Supervisors"],
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "Supervisor functionality fixed" },
            400: { description: "Invalid action" },
            401: { description: "Unauthorized" },
            404: { description: "Supervisor not found" },
          },
        },
      },
      async (context) => {
        await authorize(["admin", "super_admin"])(context);
        return fixSupervisorFunctionality(context);
      }
    )
    .put(
      "/supervisors/:id/configuration",
      {
        body: {
          type: "object",
          properties: {
            maxTeams: { type: "number" },
            specialization: { type: "string" },
            teamAssignmentPreference: {
              type: "string",
              enum: ["research", "project", "any"],
            },
            projectTypePreference: {
              type: "string",
              enum: ["software", "hardware", "research", "any"],
            },
            adminId: { type: "string" },
          },
        },
        detail: {
          summary: "Update supervisor configuration",
          tags: ["Admin", "Supervisors"],
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "Supervisor configuration updated" },
            401: { description: "Unauthorized" },
            404: { description: "Supervisor not found" },
          },
        },
      },
      async (context) => {
        await authorize(["admin", "super_admin"])(context);
        return updateSupervisorConfiguration(context);
      }
    )
    .post(
      "/teams/:teamId/assign-supervisor",
      {
        body: {
          type: "object",
          properties: {
            supervisorId: { type: "string" },
          },
          required: ["supervisorId"],
        },
        detail: {
          summary: "Assign supervisor to team",
          tags: ["Admin", "Teams", "Supervisors"],
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "Supervisor assigned successfully" },
            400: { description: "Validation error" },
            401: { description: "Unauthorized" },
            404: { description: "Team or supervisor not found" },
          },
        },
      },
      async (context) => {
        await authorize(["admin", "super_admin"])(context);
        return assignSupervisorToTeam(context);
      }
    )
    .get(
      "/teams",
      {
        query: {
          type: "object",
          properties: {
            page: { type: "number", default: 1 },
            limit: { type: "number", default: 10 },
            sort: { type: "string" },
            sessionId: { type: "string" },
            status: { type: "string" },
          },
        },
        detail: {
          summary: "Get all teams with detailed info",
          tags: ["Admin", "Teams"],
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "List of teams" },
            401: { description: "Unauthorized" },
          },
        },
      },
      async (context) => {
        await authorize(["admin", "super_admin"])(context);
        return getTeams(context);
      }
    )
    .get(
      "/projects",
      {
        query: {
          type: "object",
          properties: {
            page: { type: "number", default: 1 },
            limit: { type: "number", default: 10 },
            sort: { type: "string" },
            sessionId: { type: "string" },
            status: { type: "string" },
            type: { type: "string" },
          },
        },
        detail: {
          summary: "Get all projects with detailed info",
          tags: ["Admin", "Projects"],
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "List of projects" },
            401: { description: "Unauthorized" },
          },
        },
      },
      async (context) => {
        await authorize(["admin", "super_admin"])(context);
        return getProjects(context);
      }
    )
    .get(
      "/students",
      {
        query: {
          type: "object",
          properties: {
            page: { type: "number", default: 1 },
            limit: { type: "number", default: 10 },
            sort: { type: "string" },
            sessionId: { type: "string" },
            search: { type: "string" },
          },
        },
        detail: {
          summary: "Get all students with detailed info",
          tags: ["Admin", "Students"],
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "List of students" },
            401: { description: "Unauthorized" },
          },
        },
      },
      async (context) => {
        await authorize(["admin", "super_admin"])(context);
        return getStudents(context);
      }
    );
}
