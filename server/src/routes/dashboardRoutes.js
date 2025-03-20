import { t } from "elysia";
import * as dashboardController from "../controllers/dashboardController.js";

// Response types
const teamSummary = t.Object({
  _id: t.String(),
  name: t.String(),
  members: t.Array(
    t.Object({
      user: t.Object({
        _id: t.String(),
        fullName: t.String(),
        email: t.String(),
      }),
      role: t.String(),
    })
  ),
  project: t.Optional(
    t.Object({
      _id: t.String(),
      name: t.String(),
      type: t.String(),
      status: t.String(),
      submissionLink: t.Optional(t.String()),
      submittedAt: t.Optional(t.String()),
    })
  ),
});

const studentDashboardResponse = t.Object({
  student: t.Object({
    _id: t.String(),
    fullName: t.String(),
    email: t.String(),
    department: t.String(),
    studentId: t.String(),
  }),
  currentSession: t.Optional(
    t.Object({
      _id: t.String(),
      name: t.String(),
      startDate: t.String(),
      endDate: t.String(),
      deadlines: t.Array(
        t.Object({
          name: t.String(),
          date: t.String(),
          type: t.String(),
        })
      ),
    })
  ),
  team: t.Optional(teamSummary),
  pendingInvites: t.Array(
    t.Object({
      _id: t.String(),
      from: t.Object({
        _id: t.String(),
        name: t.String(),
      }),
      teamId: t.String(),
      status: t.String(),
      expiresAt: t.String(),
    })
  ),
});

// Error response type
const errorResponse = t.Object({
  error: t.String()
});

// Create dashboard routes plugin
export const dashboardRoutes = (app) => {
  // Student dashboard
  app.get(
    "/student",
    {
      response: {
        200: studentDashboardResponse,
        401: errorResponse,
        404: errorResponse
      }
    },
    async ({ user, set }) => {
      try {
        // Check if user exists and is authenticated
        if (!user) {
          set.status = 401;
          return { error: "Unauthorized. Authentication required." };
        }

        // Check user role
        if (user.role !== "student") {
          set.status = 403;
          return { error: "Access denied. Student access only." };
        }

        const result = await dashboardController.getStudentDashboard({ user });

        // Handle if no dashboard data found
        if (!result) {
          set.status = 404;
          return { error: "Dashboard data not found." };
        }

        return result;
      } catch (error) {
        console.error("Dashboard error:", error);
        set.status = 500;
        return { error: "Internal server error. Please try again later." };
      }
    }
  );

  return app;
};