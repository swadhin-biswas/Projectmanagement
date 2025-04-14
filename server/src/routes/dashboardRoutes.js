import { Elysia, t } from "elysia";
import {
  getAdminDashboard,
  getStudentDashboard,
  getSupervisorDashboard,
} from "../controllers/dashboardController.js";
import { NotFoundError, UnauthorizedError } from "../utils/errors.js";
import logger from "../utils/logger.js";

// Moved Schemas to the top to ensure they are defined before use
const teamMemberSchema = t.Object({
  id: t.String(),
  name: t.String(),
  role: t.String(),
  status: t.String(),
  lastActive: t.Optional(t.String()),
});

const deadlineSchema = t.Object({
  id: t.String(),
  title: t.String(),
  dueDate: t.String(),
  type: t.String(),
  isOverdue: t.Boolean(),
  daysRemaining: t.Number(),
});

const projectSchema = t.Object({
  id: t.String(),
  name: t.String(),
  status: t.String(),
  team: t.String(), // Assuming team name or ID
  progress: t.Number(),
  lastUpdated: t.String(),
});

const app = new Elysia({ prefix: "/dashboard" })

.get(
  "/",
  async (context) => {
    const { set } = context;
    try {
      logger.info("📊 Fetching student dashboard data");
      const result = await getStudentDashboard(context);
      if (!result.success) {
        set.status = result.status || 404;
        return result;
      }
      return result;
    } catch (error) {
      logger.error("❌ Student dashboard error:", error);
      context.set.status =
        error instanceof UnauthorizedError || error instanceof NotFoundError
          ? error.status
          : 500;
      return { success: false, error: error.message };
    }
  },
  {
    response: {
      200: t.Object({
        success: t.Boolean(),
        data: t.Object({
          currentSession: t.Object({
            id: t.String(),
            name: t.String(),
            startDate: t.String(),
            endDate: t.String(),
          }),
          team: t.Union([ // Allow null or the team object
            t.Null(),
            t.Object({
              id: t.String(),
              name: t.String(),
              members: t.Array(teamMemberSchema),
              projectId: t.Optional(t.String()),
            }),
          ]),
          projectStatus: t.Object({ // Change to object instead of string
            status: t.String(),
            progress: t.Number(),
            lastUpdated: t.String(),
          }),
          upcomingDeadlines: t.Array(deadlineSchema),
          recentActivities: t.Array(
            t.Object({
              id: t.String(),
              type: t.String(),
              description: t.String(),
              timestamp: t.String(),
            })
          ),
          notifications: t.Array(
            t.Object({
              id: t.String(),
              message: t.String(),
              type: t.String(),
              isRead: t.Boolean(),
              createdAt: t.String(),
            })
          ),
        }),
        timestamp: t.String(), // Add missing timestamp field
      }),
    },
    security: [{ bearerAuth: [] }],
  }
)
  // Supervisor dashboard
  .get(
    "/supervisor",
    async (context) => {
      const { set } = context;
      try {
        logger.info("📊 Fetching supervisor dashboard data");
        const result = await getSupervisorDashboard(context);
        if (!result.success) {
          set.status = result.status || 404;
          return result;
        }
        return result;
      } catch (error) {
        logger.error("❌ Supervisor dashboard error:", error);
        set.status = error.status || 500;
        return { success: false, error: error.message };
      }
    },
    {
      response: {
        200: t.Object({
          success: t.Boolean(),
          data: t.Object({
            teamsCount: t.Number(),
            studentsCount: t.Number(),
            activeProjects: t.Array(projectSchema),
            pendingApprovals: t.Array(
              t.Object({
                id: t.String(),
                type: t.String(),
                teamName: t.String(),
                submittedAt: t.String(),
              })
            ),
            upcomingDeadlines: t.Array(deadlineSchema),
            recentSubmissions: t.Array(
              t.Object({
                id: t.String(),
                projectName: t.String(),
                teamName: t.String(),
                submittedAt: t.String(),
                type: t.String(),
              })
            ),
            notifications: t.Array(
              t.Object({
                id: t.String(),
                message: t.String(),
                type: t.String(),
                isRead: t.Boolean(),
                createdAt: t.String(),
              })
            ),
          }),
        }),
      },
      security: [{ bearerAuth: [] }],
    }
  )

  // Admin dashboard
  .get(
    "/admin",
    async (context) => {
      const { set } = context;
      try {
        logger.info("📊 Fetching admin dashboard data");
        const result = await getAdminDashboard(context);
        if (!result.success) {
          set.status = result.status || 404;
          return result;
        }
        return result;
      } catch (error) {
        logger.error("❌ Admin dashboard error:", error);
        set.status = error.status || 500;
        return { success: false, error: error.message };
      }
    },
    {
      response: {
        200: t.Object({
          success: t.Boolean(),
          data: t.Object({
            stats: t.Object({
              users: t.Object({
                total: t.Number(),
                students: t.Number(),
                supervisors: t.Number(),
                pendingApprovals: t.Number(),
              }),
              teams: t.Object({
                total: t.Number(),
                active: t.Number(),
                pending: t.Number(),
                withoutSupervisor: t.Number(),
              }),
              projects: t.Object({
                total: t.Number(),
                active: t.Number(),
                completed: t.Number(),
                overdue: t.Number(),
              }),
              submissions: t.Object({
                today: t.Number(),
                thisWeek: t.Number(),
                pending: t.Number(),
              }),
            }),
            recentActivities: t.Array(
              t.Object({
                id: t.String(),
                type: t.String(),
                description: t.String(),
                user: t.Object({
                  id: t.String(),
                  name: t.String(),
                  role: t.String(),
                }),
                timestamp: t.String(),
              })
            ),
            alerts: t.Array(
              t.Object({
                id: t.String(),
                type: t.String(),
                message: t.String(),
                severity: t.String(),
                createdAt: t.String(),
              })
            ),
          }),
        }),
      },
      security: [{ bearerAuth: [] }],
    }
  );

export default app;
