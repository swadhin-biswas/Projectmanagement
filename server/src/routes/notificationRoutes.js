import { t } from "elysia";
import {
  getNotifications,
  getUnreadCount,
  markAllAsRead,
  markAsRead,
  updatePreferences,
} from "../controllers/notificationController.js";
import logger from "../utils/logger.js";

export default function notificationRoutes(app) {
  return app.group("/notifications", (app) => {
    // Common response schemas
    const notificationSchema = t.Object({
      _id: t.String(),
      type: t.String(),
      title: t.String(),
      message: t.String(),
      data: t.Optional(t.Object({})),
      isRead: t.Boolean(),
      createdAt: t.String(),
      recipient: t.Object({
        _id: t.String(),
        role: t.String(),
      }),
    });

    const successResponse = t.Object({
      success: t.Boolean(),
      message: t.Optional(t.String()),
    });

    const errorResponse = t.Object({
      success: t.Boolean(),
      error: t.String(),
    });

    return (
      app
        // Get notifications with filtering and pagination
        .get(
          "/",
          {
            query: t.Object({
              page: t.Optional(t.Number({ default: 1 })),
              limit: t.Optional(t.Number({ default: 20 })),
              type: t.Optional(t.String()),
              isRead: t.Optional(t.Boolean()),
              startDate: t.Optional(t.String({ format: "date-time" })),
              endDate: t.Optional(t.String({ format: "date-time" })),
            }),
            response: {
              200: t.Object({
                success: t.Boolean(),
                data: t.Object({
                  notifications: t.Array(notificationSchema),
                  hasMore: t.Boolean(),
                  total: t.Number(),
                }),
              }),
              400: errorResponse,
              401: errorResponse,
            },
            detail: {
              tags: ["Notifications"],
              summary: "Get user notifications",
              security: [{ bearerAuth: [] }],
            },
          },
          async (context) => {
            const { query, set } = context;
            try {
              logger.info("📬 Fetching notifications");
              return await getNotifications(context);
            } catch (error) {
              logger.error("❌ Failed to fetch notifications:", error);
              set.status = error.status || 500;
              return { success: false, error: error.message };
            }
          }
        )

        // Get unread count
        .get(
          "/unread/count",
          {
            response: {
              200: t.Object({
                success: t.Boolean(),
                count: t.Number(),
              }),
              401: errorResponse,
            },
            detail: {
              tags: ["Notifications"],
              summary: "Get unread notification count",
              security: [{ bearerAuth: [] }],
            },
          },
          async (context) => {
            const { set } = context;
            try {
              logger.info("🔢 Fetching unread count");
              const count = await getUnreadCount(context);
              return { success: true, count };
            } catch (error) {
              logger.error("❌ Failed to fetch unread count:", error);
              set.status = error.status || 500;
              return { success: false, error: error.message };
            }
          }
        )

        // Mark notification as read
        .put(
          "/:id/read",
          {
            response: {
              200: successResponse,
              400: errorResponse,
              401: errorResponse,
              404: errorResponse,
            },
            detail: {
              tags: ["Notifications"],
              summary: "Mark notification as read",
              security: [{ bearerAuth: [] }],
            },
          },
          async (context) => {
            const { params, set } = context;
            try {
              logger.info("✓ Marking notification as read", { id: params.id });
              await markAsRead(context);
              return { success: true, message: "Notification marked as read" };
            } catch (error) {
              logger.error("❌ Failed to mark notification as read:", error);
              set.status = error.status || 500;
              return { success: false, error: error.message };
            }
          }
        )

        // Mark all notifications as read
        .put(
          "/read-all",
          {
            query: t.Object({
              type: t.Optional(t.String()),
              beforeDate: t.Optional(t.String({ format: "date-time" })),
            }),
            response: {
              200: successResponse,
              401: errorResponse,
            },
            detail: {
              tags: ["Notifications"],
              summary: "Mark all notifications as read",
              security: [{ bearerAuth: [] }],
            },
          },
          async (context) => {
            const { query, set } = context;
            try {
              logger.info("✓ Marking all notifications as read");
              await markAllAsRead(context);
              return {
                success: true,
                message: "All notifications marked as read",
              };
            } catch (error) {
              logger.error(
                "❌ Failed to mark all notifications as read:",
                error
              );
              set.status = error.status || 500;
              return { success: false, error: error.message };
            }
          }
        )

        // Update notification preferences
        .put(
          "/preferences",
          {
            body: t.Object({
              email: t.Optional(
                t.Object({
                  enabled: t.Boolean(),
                  types: t.Array(t.String()),
                  frequency: t.String({
                    enum: ["immediate", "daily", "weekly"],
                  }),
                })
              ),
              push: t.Optional(
                t.Object({
                  enabled: t.Boolean(),
                  types: t.Array(t.String()),
                })
              ),
              inApp: t.Optional(
                t.Object({
                  types: t.Array(t.String()),
                  autoMarkRead: t.Boolean(),
                })
              ),
            }),
            response: {
              200: successResponse,
              400: errorResponse,
              401: errorResponse,
            },
            detail: {
              tags: ["Notifications"],
              summary: "Update notification preferences",
              security: [{ bearerAuth: [] }],
            },
          },
          async (context) => {
            const { set } = context;
            try {
              logger.info("⚙️ Updating notification preferences");
              await updatePreferences(context);
              return {
                success: true,
                message: "Preferences updated successfully",
              };
            } catch (error) {
              logger.error("❌ Failed to update preferences:", error);
              set.status = error.status || 500;
              return { success: false, error: error.message };
            }
          }
        )
    );
  });
}
