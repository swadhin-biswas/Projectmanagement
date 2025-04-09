import { t } from "elysia";
import {
  getUserProfile,
  loginUser,
  registerUser,
  requestPasswordReset,
  resetPassword,
  updateProfile,
  verifyEmail,
} from "../controllers/authController.js";
import logger from "../utils/logger.js";

export default function userRoutes(app) {
  return app.group("/api/users", (app) => {
    return (
      app
        // Login route
        .post(
          "/login",
          {
            body: t.Object({
              email: t.String({ format: "email" }),
              password: t.String(),
            }),
            detail: {
              tags: ["Auth"],
              summary: "User login",
            },
          },
          async ({ body, set }) => {
            try {
              logger.info("🔑 Login attempt");
              const result = await loginUser(body);
              return {
                success: true,
                ...result,
              };
            } catch (error) {
              logger.error("❌ Login failed:", error);
              set.status = error.status || 401;
              return {
                success: false,
                error: error.message,
              };
            }
          }
        )

        // Registration route
        .post(
          "/register",
          {
            body: t.Object({
              email: t.String({ format: "email" }),
              password: t.String({ minLength: 8 }),
              fullName: t.String(),
              role: t.Union([t.Literal("student"), t.Literal("supervisor")]),
              department: t.String(),
            }),
            detail: {
              tags: ["Auth"],
              summary: "User registration",
            },
          },
          async ({ body, set }) => {
            try {
              logger.info("📝 Registration attempt");
              const result = await registerUser(body);
              set.status = 201;
              return {
                success: true,
                ...result,
              };
            } catch (error) {
              logger.error("❌ Registration failed:", error);
              set.status = error.status || 400;
              return {
                success: false,
                error: error.message,
              };
            }
          }
        )

        // Get profile route
        .get(
          "/profile",
          {
            detail: {
              tags: ["Users"],
              summary: "Get user profile",
              security: [{ bearerAuth: [] }],
            },
          },
          async ({ user, set }) => {
            try {
              logger.info("👤 Profile request");
              const result = await getUserProfile({ user, set });
              return result; // This will now return {success, data, timestamp}
            } catch (error) {
              logger.error("❌ Profile fetch failed:", error);
              set.status = error.status || 404;
              return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString(),
              };
            }
          }
        )

        // Update profile route
        .put(
          "/profile",
          {
            body: t.Object({
              fullName: t.Optional(t.String()),
              department: t.Optional(t.String()),
              profilePicture: t.Optional(t.String()),
            }),
            detail: {
              tags: ["Users"],
              summary: "Update user profile",
              security: [{ bearerAuth: [] }],
            },
          },
          async ({ user, body, set }) => {
            try {
              logger.info("✏️ Profile update request");
              return await updateProfile(user.id, body);
            } catch (error) {
              logger.error("❌ Profile update failed:", error);
              set.status = error.status || 400;
              return {
                success: false,
                error: error.message,
              };
            }
          }
        )

        // Email verification route
        .post(
          "/verify-email/:token",
          {
            params: t.Object({
              token: t.String(),
            }),
            detail: {
              tags: ["Auth"],
              summary: "Verify email address",
            },
          },
          async ({ params, set }) => {
            try {
              logger.info("✉️ Email verification attempt");
              return await verifyEmail(params.token);
            } catch (error) {
              logger.error("❌ Email verification failed:", error);
              set.status = error.status || 400;
              return {
                success: false,
                error: error.message,
              };
            }
          }
        )

        // Password reset request route
        .post(
          "/reset-password-request",
          {
            body: t.Object({
              email: t.String({ format: "email" }),
            }),
            detail: {
              tags: ["Auth"],
              summary: "Request password reset",
            },
          },
          async ({ body, set }) => {
            try {
              logger.info("🔑 Password reset requested");
              return await requestPasswordReset(body.email);
            } catch (error) {
              logger.error("❌ Password reset request failed:", error);
              set.status = error.status || 400;
              return {
                success: false,
                error: error.message,
              };
            }
          }
        )

        // Reset password route
        .post(
          "/reset-password/:token",
          {
            params: t.Object({
              token: t.String(),
            }),
            body: t.Object({
              password: t.String({ minLength: 8 }),
            }),
            detail: {
              tags: ["Auth"],
              summary: "Reset password with token",
            },
          },
          async ({ params, body, set }) => {
            try {
              logger.info("🔑 Password reset attempt");
              return await resetPassword(params.token, body.password);
            } catch (error) {
              logger.error("❌ Password reset failed:", error);
              set.status = error.status || 400;
              return {
                success: false,
                error: error.message,
              };
            }
          }
        )
    );
  });
}
