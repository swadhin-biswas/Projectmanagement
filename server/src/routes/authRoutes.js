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
import { authorize } from "../middleware/auth.js";
import logger from "../utils/logger.js";

export default function authRoutes(app) {
  return app.group("/auth", (app) => {
    // Common schemas
    const registerSchema = t.Object({
      fullName: t.String({ minLength: 2, maxLength: 50 }),
      email: t.String({ format: "email" }),
      password: t.String({ minLength: 8 }),
      role: t.Union([
        t.Literal("student"),
        t.Literal("supervisor"),
        t.Literal("admin"),
      ]),
      department: t.String({ minLength: 2, maxLength: 50 }),
      studentId: t.Optional(t.String()),
      supervisorId: t.Optional(t.String()),
      specialization: t.Optional(t.String()),
    });

    const loginSchema = t.Object({
      email: t.String({ format: "email" }),
      password: t.String(),
    });

    const userProfileSchema = t.Object({
      _id: t.String(),
      fullName: t.String(),
      email: t.String(),
      role: t.String(),
      department: t.String(),
      isApproved: t.Boolean(),
      createdAt: t.String(),
      profilePicture: t.Optional(t.String()),
      studentId: t.Optional(t.String()),
      supervisorId: t.Optional(t.String()),
      specialization: t.Optional(t.String()),
    });

    const updateProfileSchema = t.Object({
      fullName: t.Optional(t.String()),
      department: t.Optional(t.String()),
      profilePicture: t.Optional(t.String()),
      specialization: t.Optional(t.String()),
    });

    return app
      // Authentication routes
      .post("/register", {
        body: registerSchema,
        response: {
          201: t.Object({
            success: t.Boolean(),
            message: t.String(),
            token: t.String(),
            user: userProfileSchema,
          }),
        },
      }, async ({ body, set }) => {
        try {
          logger.info("📝 New user registration");
          const result = await registerUser(body);
          set.status = 201;
          return result;
        } catch (error) {
          logger.error("❌ Registration failed:", error);
          set.status = error.status || 400;
          return {
            success: false,
            error: error.message
          };
        }
      })

      .post("/login", {
        body: loginSchema,
        response: {
          200: t.Object({
            success: t.Boolean(),
            token: t.String(),
            user: userProfileSchema,
          }),
        },
      }, async ({ body, set }) => {
        try {
          logger.info("🔑 Login attempt");
          return await loginUser(body);
        } catch (error) {
          logger.error("❌ Login failed:", error);
          set.status = error.status || 401;
          return {
            success: false,
            error: error.message
          };
        }
      })

      // Profile management routes
      .get("/profile", {
        response: {
          200: t.Object({
            success: t.Boolean(),
            user: userProfileSchema,
          }),
        },
      }, async ({ user, set }) => {
        try {
          logger.info("👤 Profile request");
          const result = await getUserProfile(user);
          return {
            success: true,
            user: result
          };
        } catch (error) {
          logger.error("❌ Profile fetch failed:", error);
          set.status = error.status || 404;
          return {
            success: false,
            error: error.message
          };
        }
      })

      .put("/profile", {
        body: updateProfileSchema,
        response: {
          200: t.Object({
            success: t.Boolean(),
            user: userProfileSchema,
          }),
        },
      }, async ({ user, body, set }) => {
        try {
          logger.info("✏️ Profile update request");
          await authorize()(user);
          const result = await updateProfile(user.id, body);
          return {
            success: true,
            user: result
          };
        } catch (error) {
          logger.error("❌ Profile update failed:", error);
          set.status = error.status || 400;
          return {
            success: false,
            error: error.message
          };
        }
      })

      // Account verification routes
      .post("/verify-email/:token", {
        params: t.Object({
          token: t.String()
        }),
        response: {
          200: t.Object({
            success: t.Boolean(),
            message: t.String()
          })
        }
      }, async ({ params, set }) => {
        try {
          logger.info("✉️ Email verification attempt");
          return await verifyEmail(params.token);
        } catch (error) {
          logger.error("❌ Email verification failed:", error);
          set.status = error.status || 400;
          return {
            success: false,
            error: error.message
          };
        }
      })

      // Password reset routes
      .post("/reset-password-request", {
        body: t.Object({
          email: t.String({ format: "email" })
        }),
        response: {
          200: t.Object({
            success: t.Boolean(),
            message: t.String()
          })
        }
      }, async ({ body, set }) => {
        try {
          logger.info("🔑 Password reset requested");
          return await requestPasswordReset(body.email);
        } catch (error) {
          logger.error("❌ Password reset request failed:", error);
          set.status = error.status || 400;
          return {
            success: false,
            error: error.message
          };
        }
      })

      .post("/reset-password/:token", {
        params: t.Object({
          token: t.String()
        }),
        body: t.Object({
          password: t.String({ minLength: 8 })
        }),
        response: {
          200: t.Object({
            success: t.Boolean(),
            message: t.String()
          })
        }
      }, async ({ params, body, set }) => {
        try {
          logger.info("🔑 Password reset attempt");
          return await resetPassword(params.token, body.password);
        } catch (error) {
          logger.error("❌ Password reset failed:", error);
          set.status = error.status || 400;
          return {
            success: false,
            error: error.message
          };
        }
      });
  });
}
