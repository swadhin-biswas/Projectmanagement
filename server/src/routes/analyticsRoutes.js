import { t } from "elysia";
import {
  getPerformanceMetrics,
  getSessionAnalytics,
  getSubmissionStatistics,
  getSupervisorAnalytics,
  getSystemOverview,
  getTeamAnalytics,
  getTeamStatistics,
} from "../controllers/analyticsController.js";
import { authorize } from "../middleware/auth.js";
import logger from "../utils/logger.js";

export default function analyticsRoutes(app) {
  // Common response schema
  const analyticsResponseSchema = t.Object({
    success: t.Boolean(),
    data: t.Object({}), // Generic data object as analytics responses vary
    error: t.Optional(t.String()),
  });

  // Define all routes directly on the app object without nesting groups
  app.get("/api/analytics/admin/overview", {
    response: analyticsResponseSchema,
    detail: {
      tags: ["Analytics", "Admin"],
      summary: "Get system overview statistics",
      security: [{ bearerAuth: [] }],
    },
  }, async (context) => {
    try {
      logger.info("📊 Fetching system overview");
      await authorize(["admin", "super_admin"])(context);
      const data = await getSystemOverview();
      return { success: true, data };
    } catch (error) {
      logger.error("❌ Failed to fetch system overview:", error);
      context.set.status = error.status || 500;
      return { success: false, error: error.message };
    }
  });

  app.get("/api/analytics/admin/teams", {
    query: t.Object({
      sessionId: t.Optional(t.String()),
      status: t.Optional(t.String()),
    }),
    response: analyticsResponseSchema,
    detail: {
      tags: ["Analytics", "Admin"],
      summary: "Get team statistics",
      security: [{ bearerAuth: [] }],
    },
  }, async (context) => {
    try {
      logger.info("📊 Fetching team statistics");
      await authorize(["admin", "super_admin"])(context);
      const data = await getTeamStatistics(context.query);
      return { success: true, data };
    } catch (error) {
      logger.error("❌ Failed to fetch team statistics:", error);
      context.set.status = error.status || 500;
      return { success: false, error: error.message };
    }
  });

  app.get("/api/analytics/admin/submissions", {
    query: t.Object({
      startDate: t.Optional(t.String({ format: "date-time" })),
      endDate: t.Optional(t.String({ format: "date-time" })),
      type: t.Optional(t.String()),
    }),
    response: analyticsResponseSchema,
    detail: {
      tags: ["Analytics", "Admin"],
      summary: "Get submission statistics",
      security: [{ bearerAuth: [] }],
    },
  }, async (context) => {
    try {
      logger.info("📊 Fetching submission statistics");
      await authorize(["admin", "super_admin"])(context);
      const data = await getSubmissionStatistics(context.query);
      return { success: true, data };
    } catch (error) {
      logger.error("❌ Failed to fetch submission statistics:", error);
      context.set.status = error.status || 500;
      return { success: false, error: error.message };
    }
  });

  app.get("/api/analytics/admin/performance", {
    query: t.Object({
      period: t.Optional(t.String({ enum: ["daily", "weekly", "monthly"] })),
      metric: t.Optional(t.String()),
    }),
    response: analyticsResponseSchema,
    detail: {
      tags: ["Analytics", "Admin"],
      summary: "Get performance metrics",
      security: [{ bearerAuth: [] }],
    },
  }, async (context) => {
    try {
      logger.info("📊 Fetching performance metrics");
      await authorize(["admin", "super_admin"])(context);
      const data = await getPerformanceMetrics(context.query);
      return { success: true, data };
    } catch (error) {
      logger.error("❌ Failed to fetch performance metrics:", error);
      context.set.status = error.status || 500;
      return { success: false, error: error.message };
    }
  });

  // Session analytics
  app.get("/api/analytics/sessions/:id", {
    params: t.Object({
      id: t.String(),
    }),
    query: t.Object({
      includeTeams: t.Optional(t.Boolean()),
      includeProjects: t.Optional(t.Boolean()),
    }),
    response: analyticsResponseSchema,
    detail: {
      tags: ["Analytics", "Sessions"],
      summary: "Get session analytics",
      security: [{ bearerAuth: [] }],
    },
  }, async (context) => {
    try {
      logger.info("📊 Fetching session analytics", { sessionId: context.params.id });
      await authorize(["admin", "super_admin", "supervisor"])(context);
      const data = await getSessionAnalytics(context.params.id, context.query);
      return { success: true, data };
    } catch (error) {
      logger.error("❌ Failed to fetch session analytics:", error);
      context.set.status = error.status || 500;
      return { success: false, error: error.message };
    }
  });

  // Supervisor analytics
  app.get("/api/analytics/supervisors/:id", {
    params: t.Object({
      id: t.String(),
    }),
    query: t.Object({
      startDate: t.Optional(t.String({ format: "date-time" })),
      endDate: t.Optional(t.String({ format: "date-time" })),
    }),
    response: analyticsResponseSchema,
    detail: {
      tags: ["Analytics", "Supervisors"],
      summary: "Get supervisor analytics",
      security: [{ bearerAuth: [] }],
    },
  }, async (context) => {
    try {
      logger.info("📊 Fetching supervisor analytics", { supervisorId: context.params.id });
      await authorize(["supervisor", "admin", "super_admin"])(context);
      const data = await getSupervisorAnalytics(context.params.id, context.query);
      return { success: true, data };
    } catch (error) {
      logger.error("❌ Failed to fetch supervisor analytics:", error);
      context.set.status = error.status || 500;
      return { success: false, error: error.message };
    }
  });

  // Team analytics
  app.get("/api/analytics/teams/:id", {
    params: t.Object({
      id: t.String(),
    }),
    query: t.Object({
      includeMembers: t.Optional(t.Boolean()),
      includeActivity: t.Optional(t.Boolean()),
    }),
    response: analyticsResponseSchema,
    detail: {
      tags: ["Analytics", "Teams"],
      summary: "Get team analytics",
      security: [{ bearerAuth: [] }],
    },
  }, async (context) => {
    try {
      logger.info("📊 Fetching team analytics", { teamId: context.params.id });
      await authorize(["student", "supervisor", "admin"])(context);
      const data = await getTeamAnalytics(context.params.id, context.query);
      return { success: true, data };
    } catch (error) {
      logger.error("❌ Failed to fetch team analytics:", error);
      context.set.status = error.status || 500;
      return { success: false, error: error.message };
    }
  });

  return app;
}