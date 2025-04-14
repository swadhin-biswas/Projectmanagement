import { t } from "elysia";
import mongoose from "mongoose";
import {
  changePassword,
  loginUser,
  registerUser,
  requestPasswordReset,
  resetPassword,
  sendVerificationEmail,
  updateProfile,
  verifyEmail,
} from "../controllers/authController.js";
import logger from "../utils/logger.js";

export default function authRoutes(app) {
  // Define reusable schemas
  const userProfileSchema = t.Object({
    _id: t.String(),
    fullName: t.String(),
    email: t.String(),
    role: t.String(),
    department: t.String(),
    isApproved: t.Boolean(),
    profilePicture: t.Optional(t.Union([t.String(), t.Null()])),
    studentId: t.Optional(t.String()),
    supervisorId: t.Optional(t.String()),
  });

  const updateProfileSchema = t.Object({
    fullName: t.Optional(t.String({ minLength: 2, maxLength: 50 })),
    department: t.Optional(t.String({ minLength: 2, maxLength: 50 })),
    profilePicture: t.Optional(t.String()),
    specialization: t.Optional(t.String()),
  });

  const changePasswordSchema = t.Object({
    currentPassword: t.String(),
    newPassword: t.String({
      minLength: 8,
      pattern:
        "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$",
      error:
        "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character",
    }),
  });

  return app.group("/auth", (app) =>
    app
      .derive(({ request }) => {
        const connectionState = mongoose.connection.readyState;
        logger.debug(
          `MongoDB connection state in route middleware: ${connectionState}`
        );
        if (connectionState !== 1) {
          logger.warn(
            `Request received with MongoDB not fully connected (state: ${connectionState})`
          );
          throw new Error("Database not connected");
        }
        return {};
      })
      .post("/register", registerUser, {
        body: t.Object({
          fullName: t.String({ minLength: 2, maxLength: 50 }),
          email: t.String({ format: "email" }),
          password: t.String({
            minLength: 8,
            pattern:
              "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$",
            error:
              "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character",
          }),
          role: t.Union([t.Literal("student"), t.Literal("supervisor")]),
          department: t.String({ minLength: 2, maxLength: 50 }),
          studentId: t.Optional(t.String()),
          specialization: t.Optional(t.String()),
        }),
        response: {
          201: t.Object({
            success: t.Boolean(),
            message: t.String(),
            token: t.Optional(t.String()),
            user: t.Optional(userProfileSchema),
            error: t.Optional(t.Union([t.String(), t.Null()])),
            timestamp: t.String(),
          }),
          400: t.Object({
            success: t.Boolean(),
            error: t.String(),
            field: t.Optional(t.String()),
            timestamp: t.String(),
          }),
          409: t.Object({
            success: t.Boolean(),
            error: t.String(),
            timestamp: t.String(),
          }),
          500: t.Object({
            success: t.Boolean(),
            error: t.String(),
            timestamp: t.String(),
          }),
          503: t.Object({
            success: t.Boolean(),
            error: t.String(),
            timestamp: t.String(),
          }),
          504: t.Object({
            success: t.Boolean(),
            error: t.String(),
            timestamp: t.String(),
          }),
        },
        detail: {
          summary: "Register a new user (student or supervisor)",
          tags: ["Auth"],
        },
      })

      .get("/profile", async ({ user }) => {
        return {
          success: true,
          data: {
            id: user.id,
            email: user.email,
            role: user.role,
          },
          error: null,
          timestamp: new Date().toISOString(),
        };
      })

      .post("/login", loginUser, {
        body: t.Object({
          email: t.String({ format: "email" }),
          password: t.String(),
        }),
        response: {
          200: t.Object({
            success: t.Boolean(),
            token: t.Optional(t.String()),
            user: t.Optional(userProfileSchema),
            expiresIn: t.Optional(t.String()),
            error: t.Optional(t.Union([t.String(), t.Null()])),
            timestamp: t.String(),
          }),
          400: t.Object({
            success: t.Boolean(),
            error: t.String(),
            field: t.Optional(t.String()),
            timestamp: t.String(),
          }),
          401: t.Object({
            success: t.Boolean(),
            error: t.String(),
            timestamp: t.String(),
          }),
          500: t.Object({
            success: t.Boolean(),
            error: t.String(),
            timestamp: t.String(),
          }),
          503: t.Object({
            success: t.Boolean(),
            error: t.String(),
            timestamp: t.String(),
          }),
          504: t.Object({
            success: t.Boolean(),
            error: t.String(),
            timestamp: t.String(),
          }),
        },
        detail: {
          summary: "Login a user",
          tags: ["Auth"],
        },
      })

      .post(
        "/logout",
        async ({ revokeCurrentToken, user, set }) => {
          // If no user, they're already logged out
          if (!user) {
            return {
              success: true,
              message: "Already logged out",
              timestamp: new Date().toISOString(),
            };
          }

          try {
            // Revoke the current token
            const revoked = revokeCurrentToken();

            if (revoked) {
              logger.info(`User ${user.id} logged out successfully`);
              return {
                success: true,
                message: "Logged out successfully",
                timestamp: new Date().toISOString(),
              };
            } else {
              logger.warn(`Failed to revoke token for user ${user.id}`);
              set.status = 500;
              return {
                success: false,
                error: "Failed to logout properly",
                timestamp: new Date().toISOString(),
              };
            }
          } catch (error) {
            logger.error("Error during logout:", error);
            set.status = 500;
            return {
              success: false,
              error: "Internal server error during logout",
              timestamp: new Date().toISOString(),
            };
          }
        },
        {
          detail: {
            summary: "Logout a user and invalidate their token",
            tags: ["Auth"],
            security: [{ bearerAuth: [] }],
            responses: {
              200: { description: "Successfully logged out" },
              500: { description: "Server error during logout process" },
            },
          },
        }
      )

      .put("/profile", updateProfile, {
        body: updateProfileSchema,
        response: {
          200: t.Object({
            success: t.Boolean(),
            user: userProfileSchema,
            message: t.Optional(t.String()),
            error: t.Optional(t.Union([t.String(), t.Null()])),
            timestamp: t.String(),
          }),
          400: t.Object({
            success: t.Boolean(),
            error: t.String(),
            field: t.Optional(t.String()),
            timestamp: t.String(),
          }),
          404: t.Object({
            success: t.Boolean(),
            error: t.String(),
            timestamp: t.String(),
          }),
          409: t.Object({
            success: t.Boolean(),
            error: t.String(),
            timestamp: t.String(),
          }),
          500: t.Object({
            success: t.Boolean(),
            error: t.String(),
            timestamp: t.String(),
          }),
        },
        detail: {
          summary: "Update authenticated user profile",
          tags: ["Auth"],
        },
      })
      .post("/verify-email", verifyEmail, {
        body: t.Object({
          email: t.String({ format: "email" }),
          token: t.String(),
        }),
        response: {
          200: t.Object({
            success: t.Boolean(),
            message: t.String(),
            error: t.Optional(t.Union([t.String(), t.Null()])),
            timestamp: t.String(),
          }),
          400: t.Object({
            success: t.Boolean(),
            error: t.String(),
            timestamp: t.String(),
          }),
          401: t.Object({
            success: t.Boolean(),
            error: t.String(),
            timestamp: t.String(),
          }),
          500: t.Object({
            success: t.Boolean(),
            error: t.String(),
            timestamp: t.String(),
          }),
        },
        detail: {
          summary: "Verify user email with token",
          tags: ["Auth"],
        },
      })
      .post("/reset-password-request", requestPasswordReset, {
        body: t.Object({
          email: t.String({ format: "email" }),
        }),
        response: {
          200: t.Object({
            success: t.Boolean(),
            message: t.String(),
            error: t.Optional(t.Union([t.String(), t.Null()])),
            timestamp: t.String(),
          }),
          400: t.Object({
            success: t.Boolean(),
            error: t.String(),
            timestamp: t.String(),
          }),
          404: t.Object({
            success: t.Boolean(),
            error: t.String(),
            timestamp: t.String(),
          }),
          500: t.Object({
            success: t.Boolean(),
            error: t.String(),
            timestamp: t.String(),
          }),
        },
        detail: {
          summary: "Request password reset",
          tags: ["Auth"],
        },
      })
      .post("/reset-password/:token", resetPassword, {
        params: t.Object({
          token: t.String(),
        }),
        body: t.Object({
          password: t.String({
            minLength: 8,
            pattern:
              "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$",
            error:
              "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character",
          }),
        }),
        response: {
          200: t.Object({
            success: t.Boolean(),
            message: t.String(),
            error: t.Optional(t.Union([t.String(), t.Null()])),
            timestamp: t.String(),
          }),
          400: t.Object({
            success: t.Boolean(),
            error: t.String(),
            timestamp: t.String(),
          }),
          401: t.Object({
            success: t.Boolean(),
            error: t.String(),
            timestamp: t.String(),
          }),
          500: t.Object({
            success: t.Boolean(),
            error: t.String(),
            timestamp: t.String(),
          }),
        },
        detail: {
          summary: "Reset password with token",
          tags: ["Auth"],
        },
      })
      .post("/change-password", changePassword, {
        body: changePasswordSchema,
        response: {
          200: t.Object({
            success: t.Boolean(),
            message: t.String(),
            error: t.Optional(t.Union([t.String(), t.Null()])),
            timestamp: t.String(),
          }),
          400: t.Object({
            success: t.Boolean(),
            error: t.String(),
            timestamp: t.String(),
          }),
          401: t.Object({
            success: t.Boolean(),
            error: t.String(),
            timestamp: t.String(),
          }),
          500: t.Object({
            success: t.Boolean(),
            error: t.String(),
            timestamp: t.String(),
          }),
        },
        detail: {
          summary: "Change user password",
          tags: ["Auth"],
        },
      })
      .post("/send-verification-email", sendVerificationEmail, {
        response: {
          200: t.Object({
            success: t.Boolean(),
            message: t.String(),
            error: t.Optional(t.Union([t.String(), t.Null()])),
            timestamp: t.String(),
          }),
          400: t.Object({
            success: t.Boolean(),
            error: t.String(),
            timestamp: t.String(),
          }),
          401: t.Object({
            success: t.Boolean(),
            error: t.String(),
            timestamp: t.String(),
          }),
          500: t.Object({
            success: t.Boolean(),
            error: t.String(),
            timestamp: t.String(),
          }),
        },
        detail: {
          summary: "Send verification email to user",
          tags: ["Auth"],
        },
      })
  );
}
