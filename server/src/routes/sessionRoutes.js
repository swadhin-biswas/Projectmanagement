import { t } from "elysia";
import {
    createSession,
    getAllSessions,
    getCurrentSession,
    updateSession,
} from "../controllers/sessionController.js";
import { authorize } from "../middleware/auth.js";
import logger from "../utils/logger.js";

export default function sessionRoutes(app) {
  return app.group("/api/sessions", (app) => {
    // Common session validation schema
    const sessionSchema = {
      name: t.String({ minLength: 3 }),
      startDate: t.String({ format: "date-time" }),
      endDate: t.String({ format: "date-time" }),
      description: t.Optional(t.String()),
      maxTeamSize: t.Optional(t.Number({ minimum: 2, maximum: 6 })),
      minTeamSize: t.Optional(t.Number({ minimum: 2, maximum: 6 })),
      status: t.Optional(t.String()),
    };

    return app
      .get(
        "/",
        {
          response: {
            200: t.Object({
              success: t.Boolean(),
              data: t.Array(t.Object(sessionSchema)),
            }),
          },
        },
        async ({ set, user }) => {
          try {
            logger.info("📑 Fetching all sessions");
            await authorize(["admin", "super_admin", "supervisor"])(user);
            const result = await getAllSessions();
            return { success: true, data: result };
          } catch (error) {
            logger.error("❌ Session fetch error:", error);
            set.status = error.status || 500;
            return { success: false, error: error.message };
          }
        }
      )
      .get(
        "/current",
        {
          response: {
            200: t.Object({
              success: t.Boolean(),
              data: t.Object(sessionSchema),
            }),
          },
        },
        async ({ set }) => {
          try {
            logger.info("🎯 Fetching current session");
            return await getCurrentSession();
          } catch (error) {
            logger.error("❌ Current session fetch error:", error);
            set.status = error.status || 500;
            return { success: false, error: error.message };
          }
        }
      )
      .post(
        "/",
        {
          body: t.Object(sessionSchema),
          response: {
            201: t.Object({
              success: t.Boolean(),
              data: t.Object(sessionSchema),
            }),
          },
        },
        async ({ body, set, user }) => {
          try {
            logger.info("📝 Creating new session");
            await authorize(["admin", "super_admin"])(user);
            const result = await createSession(body);
            set.status = 201;
            return { success: true, data: result };
          } catch (error) {
            logger.error("❌ Session creation error:", { error, body });
            set.status = error.status || 500;
            return { success: false, error: error.message };
          }
        }
      )
      .patch(
        "/:id",
        {
          body: t.Partial(sessionSchema),
          response: {
            200: t.Object({
              success: t.Boolean(),
              data: t.Object(sessionSchema),
            }),
          },
        },
        async ({ params, body, set, user }) => {
          try {
            logger.info("✏️ Updating session", { sessionId: params.id });
            await authorize(["admin", "super_admin"])(user);
            const result = await updateSession(params.id, body);
            return { success: true, data: result };
          } catch (error) {
            logger.error("❌ Session update error:", {
              error,
              sessionId: params.id,
              body,
            });
            set.status = error.status || 500;
            return { success: false, error: error.message };
          }
        }
      );
  });
}
