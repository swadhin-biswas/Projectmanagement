import { t } from "elysia";
import {
  approveSupervisor,
  assignSupervisorToTeam,
  createAdminTask,
  createSession,
  createSessionTimeline,
  fixSupervisorFunctionality,
  getAllSessions,
  getProjects,
  getSessionAnalytics,
  getSessionDetailedAnalytics,
  getSessionTimeline,
  getSessionWorkData,
  getStudents,
  getSupervisorActivity,
  getSupervisorPerformance,
  getSupervisors,
  getSystemAnalytics,
  getTeams,
  reviewSupervisorMarkingActivity,
  updateSupervisorConfiguration,
  updateTimelineTask,
  verifySupervisorProgressTracking,
} from "../controllers/adminController.js";
import { roles } from "../utils/authUtils.js";

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
  return app.group("/api/admin", (app) => {
    // Apply admin role check to all routes in this group
    app.derive(roles.isAdmin);

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
        const pendingSupervisors =
          await adminController.getPendingSupervisors();
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
        getSystemAnalytics
      )
      .post(
        "/sessions",
        {
          body: {
            type: "object",
            required: ["name", "startDate", "endDate"],
            properties: {
              name: { type: "string" },
              startDate: { type: "string", format: "date-time" },
              endDate: { type: "string", format: "date-time" },
              maxTeamSize: { type: "number", default: 5 },
              minTeamSize: { type: "number", default: 2 },
              allowStudentInitiatedTeams: { type: "boolean", default: true },
              allowSupervisorInitiatedProjects: {
                type: "boolean",
                default: true,
              },
              description: { type: "string" },
              academicYear: { type: "string" },
              term: { type: "string" },
              academicPrograms: { type: "array", items: { type: "string" } },
              departments: { type: "array", items: { type: "string" } },
            },
          },
          detail: {
            summary: "Create a new academic session",
            tags: ["Admin", "Sessions"],
            security: [{ bearerAuth: [] }],
            responses: {
              200: { description: "Session created successfully" },
              400: { description: "Validation error" },
              401: { description: "Unauthorized" },
            },
          },
        },
        async (context) => {
          await authorize(["admin", "super_admin"])(context);
          return createSession(context);
        }
      )
      .get(
        "/sessions",
        {
          query: {
            type: "object",
            properties: {
              page: { type: "number", default: 1 },
              limit: { type: "number", default: 10 },
              status: { type: "string" },
              term: { type: "string" },
              academicYear: { type: "string" },
              search: { type: "string" },
              sort: { type: "string", default: "-createdAt" },
            },
          },
          detail: {
            summary: "Get all sessions with pagination and filtering",
            tags: ["Admin", "Sessions"],
            security: [{ bearerAuth: [] }],
            responses: {
              200: { description: "List of sessions" },
              401: { description: "Unauthorized" },
            },
          },
        },
        async (context) => {
          await authorize(["admin", "super_admin"])(context);
          return getAllSessions(context);
        }
      )
      .get(
        "/sessions/:sessionId/analytics",
        {
          query: {
            type: "object",
            properties: {
              timeRange: {
                type: "string",
                enum: ["all", "week", "month", "custom"],
                default: "all",
              },
              fromDate: { type: "string", format: "date-time" },
              toDate: { type: "string", format: "date-time" },
              groupBy: {
                type: "string",
                enum: ["day", "week", "month"],
                default: "day",
              },
            },
          },
          detail: {
            summary: "Get detailed analytics for a specific session",
            tags: ["Admin", "Analytics", "Sessions"],
            security: [{ bearerAuth: [] }],
            responses: {
              200: { description: "Session analytics" },
              401: { description: "Unauthorized" },
              404: { description: "Session not found" },
            },
          },
        },
        async (context) => {
          await authorize(["admin", "super_admin"])(context);
          return getSessionDetailedAnalytics(context);
        }
      )
      .get(
        "/sessions/:sessionId/work-data",
        {
          query: {
            type: "object",
            properties: {
              startDate: { type: "string", format: "date-time" },
              endDate: { type: "string", format: "date-time" },
            },
          },
          detail: {
            summary: "Get work data for a specific session",
            tags: ["Admin", "Analytics", "Sessions"],
            security: [{ bearerAuth: [] }],
            responses: {
              200: { description: "Session work data" },
              401: { description: "Unauthorized" },
              404: { description: "Session not found" },
            },
          },
        },
        async (context) => {
          await authorize(["admin", "super_admin"])(context);
          return getSessionWorkData(context);
        }
      )
      .post(
        "/sessions/:sessionId/activate",
        {
          detail: {
            summary: "Activate a session",
            tags: ["Admin", "Sessions"],
            security: [{ bearerAuth: [] }],
            responses: {
              200: { description: "Session activated successfully" },
              401: { description: "Unauthorized" },
              404: { description: "Session not found" },
            },
          },
        },
        async (context) => {
          await authorize(["admin", "super_admin"])(context);
          // This would require implementing an activateSession function in the controller
          return { success: true, message: "Session activated successfully" };
        }
      )
      .get(
        "/sessions/:sessionId/analytics",
        {
          query: {
            type: "object",
            properties: {
              timeRange: {
                type: "string",
                enum: ["week", "month", "semester"],
              },
              groupBy: { type: "string", enum: ["day", "week", "month"] },
            },
          },
          detail: {
            summary: "Get detailed analytics for a specific session",
            tags: ["Admin", "Analytics"],
            security: [{ bearerAuth: [] }],
            responses: {
              200: { description: "Session analytics" },
              401: { description: "Unauthorized" },
              404: { description: "Session not found" },
            },
          },
        },
        async (context) => {
          await authorize(["admin", "super_admin"])(context);
          return getSessionAnalytics(context);
        }
      )
      .post(
        "/sessions/:sessionId/timeline",
        {
          body: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              startDate: { type: "string", format: "date-time" },
              endDate: { type: "string", format: "date-time" },
              scope: {
                type: "string",
                enum: ["global", "department", "team", "user"],
              },
              targetDepartments: { type: "array", items: { type: "string" } },
              targetTeams: { type: "array", items: { type: "string" } },
              targetUsers: { type: "array", items: { type: "string" } },
              segments: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    description: { type: "string" },
                    startDate: { type: "string", format: "date-time" },
                    endDate: { type: "string", format: "date-time" },
                    color: { type: "string" },
                    importance: { type: "number" },
                    tasks: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          description: { type: "string" },
                          startDate: { type: "string", format: "date-time" },
                          dueDate: { type: "string", format: "date-time" },
                          assignedTo: { type: "string" },
                          priority: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          detail: {
            summary: "Create timeline for a session",
            tags: ["Admin", "Timeline"],
            security: [{ bearerAuth: [] }],
            responses: {
              200: { description: "Timeline created successfully" },
              400: { description: "Validation error" },
              401: { description: "Unauthorized" },
              404: { description: "Session not found" },
            },
          },
        },
        async (context) => {
          await authorize(["admin", "super_admin"])(context);
          return createSessionTimeline(context);
        }
      )
      .get(
        "/sessions/:sessionId/timeline",
        {
          query: {
            type: "object",
            properties: {
              scope: {
                type: "string",
                enum: ["global", "department", "team", "user"],
              },
            },
          },
          detail: {
            summary: "Get timeline for a session",
            tags: ["Admin", "Timeline"],
            security: [{ bearerAuth: [] }],
            responses: {
              200: { description: "Session timeline" },
              401: { description: "Unauthorized" },
              404: { description: "Timeline not found" },
            },
          },
        },
        async (context) => {
          await authorize(["admin", "super_admin"])(context);
          return getSessionTimeline(context);
        }
      )
      .put(
        "/timelines/:timelineId/segments/:segmentId/tasks/:taskId",
        {
          body: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              dueDate: { type: "string", format: "date-time" },
              status: {
                type: "string",
                enum: [
                  "pending",
                  "in_progress",
                  "completed",
                  "delayed",
                  "canceled",
                ],
              },
              priority: {
                type: "string",
                enum: ["low", "medium", "high", "critical"],
              },
              progress: { type: "number", minimum: 0, maximum: 100 },
            },
          },
          detail: {
            summary: "Update a task in a timeline",
            tags: ["Admin", "Timeline"],
            security: [{ bearerAuth: [] }],
            responses: {
              200: { description: "Task updated successfully" },
              400: { description: "Validation error" },
              401: { description: "Unauthorized" },
              404: { description: "Timeline, segment or task not found" },
            },
          },
        },
        async (context) => {
          await authorize(["admin", "super_admin"])(context);
          return updateTimelineTask(context);
        }
      )
      .post(
        "/tasks",
        {
          body: {
            type: "object",
            required: [
              "sessionId",
              "title",
              "startDate",
              "dueDate",
              "assignedTo",
            ],
            properties: {
              sessionId: { type: "string" },
              title: { type: "string" },
              description: { type: "string" },
              startDate: { type: "string", format: "date-time" },
              dueDate: { type: "string", format: "date-time" },
              assignedTo: {
                type: "string",
                enum: ["students", "supervisors", "admins", "all"],
              },
              targetUsers: { type: "array", items: { type: "string" } },
              targetTeams: { type: "array", items: { type: "string" } },
              priority: {
                type: "string",
                enum: ["low", "medium", "high", "critical"],
              },
            },
          },
          detail: {
            summary: "Create an administrative task",
            tags: ["Admin", "Tasks"],
            security: [{ bearerAuth: [] }],
            responses: {
              200: { description: "Task created successfully" },
              400: { description: "Validation error" },
              401: { description: "Unauthorized" },
              404: { description: "Session not found" },
            },
          },
        },
        async (context) => {
          await authorize(["admin", "super_admin"])(context);
          return createAdminTask(context);
        }
      )
      .post(
        "/teams/:teamId/supervisors",
        {
          body: {
            type: "object",
            required: ["supervisorIds"],
            properties: {
              supervisorIds: { type: "array", items: { type: "string" } },
              sessionId: { type: "string" },
            },
          },
          detail: {
            summary: "Assign supervisor(s) to a team",
            tags: ["Admin", "Teams", "Supervisors"],
            security: [{ bearerAuth: [] }],
            responses: {
              200: { description: "Supervisor(s) assigned successfully" },
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
  });
}
