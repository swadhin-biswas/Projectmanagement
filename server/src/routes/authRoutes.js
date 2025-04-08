import { t } from "elysia";
import mongoose from "mongoose";
import {
  getUserProfile,
  requestPasswordReset,
  resetPassword,
  updateProfile,
  verifyEmail,
} from "../controllers/authController.js";
import { authorize } from "../middleware/auth.js";
import { Student, User } from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";
import logger from "../utils/logger.js";

export default function authRoutes(app) {
  return app.group("/api/auth", (app) => {
    // Common schemas
    const registerSchema = t.Object({
      fullName: t.String({ minLength: 2, maxLength: 50 }),
      email: t.String({ format: "email" }),
      password: t.String({
        minLength: 8,
        pattern:
          "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$",
        error:
          "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      }),
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
      profilePicture: t.Optional(t.String()),
      studentId: t.Optional(t.String()),
      supervisorId: t.Optional(t.String()),
    });

    const updateProfileSchema = t.Object({
      fullName: t.Optional(t.String({ minLength: 2, maxLength: 50 })),
      department: t.Optional(t.String({ minLength: 2, maxLength: 50 })),
      profilePicture: t.Optional(t.String()),
      specialization: t.Optional(t.String()),
    });

    // Add a connection state middleware - Fixed to use Elysia's middleware pattern
    app.derive(({ request }) => {
      const connectionState = mongoose.connection.readyState;
      logger.debug(
        `MongoDB connection state in route middleware: ${connectionState}`
      );

      // If not connected, log the issue but allow the request to proceed
      if (connectionState !== 1) {
        logger.warn(
          `Request received with MongoDB not fully connected (state: ${connectionState})`
        );
      }

      // Return anything you want to add to the context
      return {};
    });

    // Fixed implementation - direct route handler with explicit response formatting
    app.post("/register", async ({ body, set }) => {
      try {
        logger.info("📝 Direct registration attempt for:", body?.email);

        // Basic validation
        if (
          !body ||
          !body.email ||
          !body.password ||
          !body.fullName ||
          !body.role ||
          !body.department
        ) {
          set.status = 400;
          return {
            success: false,
            error: "Missing required fields",
            timestamp: new Date().toISOString(),
            debug: "This is the direct handler",
          };
        }

        // Check if email already exists
        const existingUser = await User.findOne({ email: body.email });
        if (existingUser) {
          set.status = 409;
          return {
            success: false,
            error: "Email already registered",
            timestamp: new Date().toISOString(),
            debug: "This is the direct handler",
          };
        }

        // Create new user
        const user = new User({
          email: body.email,
          password: body.password, // Will be hashed by pre-save hook
          fullName: body.fullName,
          role: body.role,
          department: body.department,
          isApproved: body.role === "student",
          status: body.role === "student" ? "active" : "pending",
          isEmailVerified: true,
        });

        // Save user
        const savedUser = await user.save();

        // Create student profile if applicable
        if (body.role === "student") {
          // Generate student ID
          const currentYear = new Date().getFullYear().toString().slice(-2);
          const prefix = `S${currentYear}-`;
          const latestStudent = await Student.findOne().sort({ studentId: -1 });

          let nextNumber = 1000;
          if (latestStudent && latestStudent.studentId?.startsWith(prefix)) {
            const currentNumber = parseInt(
              latestStudent.studentId.replace(prefix, ""),
              10
            );
            nextNumber = currentNumber + 1;
          }

          const studentId = body.studentId || `${prefix}${nextNumber}`;

          // Create student
          const student = new Student({
            user: savedUser._id,
            studentId: studentId,
          });

          await student.save();
        }

        // Generate token for students
        const token =
          body.role === "student" ? generateToken(savedUser._id) : null;

        // Create user object for response
        const userResponse = {
          _id: savedUser._id,
          fullName: savedUser.fullName,
          email: savedUser.email,
          role: savedUser.role,
          department: savedUser.department,
          isApproved: savedUser.isApproved,
          status: savedUser.status,
          isEmailVerified: savedUser.isEmailVerified,
        };

        set.status = 201;
        return {
          success: true,
          message:
            body.role === "supervisor"
              ? "Registration successful. Your account will be reviewed by an administrator."
              : "Registration successful.",
          token,
          user: userResponse,
          timestamp: new Date().toISOString(),
          debug: "This is the direct handler",
        };
      } catch (error) {
        logger.error("❌ Direct registration handler error:", error);

        let statusCode = 500;
        let errorMessage = "Registration failed. Please try again.";

        // Handle validation errors
        if (error.name === "ValidationError") {
          statusCode = 400;
          const firstErrorField = Object.keys(error.errors)[0];
          errorMessage = error.errors[firstErrorField].message;
        }

        // Handle duplicate key errors
        if (error.code === 11000) {
          statusCode = 409;
          const field = Object.keys(error.keyPattern)[0];
          errorMessage = `This ${field} is already registered`;
        }

        set.status = statusCode;
        return {
          success: false,
          error: errorMessage,
          timestamp: new Date().toISOString(),
          debug: "This is the direct handler",
        };
      }
    });

    // Add a simple test login endpoint that doesn't use the controller
    app.post("/test-login", async ({ body, set }) => {
      try {
        logger.info("🧪 Test login attempt for:", body?.email);

        // Basic validation
        if (!body || !body.email || !body.password) {
          set.status = 400;
          return {
            success: false,
            error: "Email and password are required",
            timestamp: new Date().toISOString(),
          };
        }

        // Find user
        const user = await User.findOne({ email: body.email }).select(
          "+password"
        );

        if (!user) {
          logger.info(`No user found with email: ${body.email}`);
          set.status = 401;
          return {
            success: false,
            error: "Invalid email or password",
            timestamp: new Date().toISOString(),
          };
        }

        logger.info(`User found with ID: ${user._id}`);

        // Verify password
        const isMatch = await user.comparePassword(body.password);
        if (!isMatch) {
          logger.info(`Invalid password for user: ${body.email}`);
          set.status = 401;
          return {
            success: false,
            error: "Invalid email or password",
            timestamp: new Date().toISOString(),
          };
        }

        logger.info(`Password verified for user: ${user._id}`);

        // Generate token
        const token = generateToken(user._id);
        logger.info(`Generated token for user: ${user._id}`);

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Remove sensitive data
        const userData = user.toObject();
        delete userData.password;

        logger.info(`Test login successful for user: ${body.email}`);

        // Return success response
        return {
          success: true,
          token,
          user: {
            _id: userData._id,
            fullName: userData.fullName,
            email: userData.email,
            role: userData.role,
            department: userData.department,
            isApproved: userData.isApproved,
          },
          message: "Login successful",
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        logger.error("❌ Test login failed:", error);

        set.status = error.status || 500;
        return {
          success: false,
          error: error.message || "Login failed. Please try again.",
          timestamp: new Date().toISOString(),
        };
      }
    });

    return (
      app
        .post(
          "/login",
          {
            body: loginSchema,
            response: {
              200: t.Object({
                success: t.Boolean(),
                token: t.Optional(t.String()),
                user: t.Optional(userProfileSchema),
                error: t.Optional(t.String()),
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
          },
          async ({ body, set }) => {
            try {
              logger.info("🔑 Login attempt for:", body.email);

              // Debug: Log connection state
              logger.debug(
                `MongoDB connection state: ${mongoose.connection.readyState}`
              );

              // Find user
              logger.info(`Looking for user: ${body.email}`);
              const user = await User.findOne({ email: body.email }).select(
                "+password"
              );

              if (!user) {
                logger.warn(`No user found with email: ${body.email}`);
                set.status = 401;
                return {
                  success: false,
                  error: "Invalid email or password",
                  timestamp: new Date().toISOString(),
                };
              }

              logger.info(`User found: ${user._id}`);

              // Verify password
              const isMatch = await user.comparePassword(body.password);
              if (!isMatch) {
                logger.warn(`Invalid password for user: ${body.email}`);
                set.status = 401;
                return {
                  success: false,
                  error: "Invalid email or password",
                  timestamp: new Date().toISOString(),
                };
              }

              logger.info(`Password verified for user: ${user._id}`);

              // Generate token
              const token = generateToken(user._id);
              logger.info(`Generated token for user: ${user._id}`);

              // Update last login
              user.lastLogin = new Date();
              await user.save();

              // Prepare user data for response
              const userData = user.toObject();
              delete userData.password;

              logger.info(`Login successful for user: ${body.email}`);

              // Return success response
              return {
                success: true,
                token,
                user: {
                  _id: userData._id,
                  fullName: userData.fullName,
                  email: userData.email,
                  role: userData.role,
                  department: userData.department,
                  isApproved: userData.isApproved,
                },
                timestamp: new Date().toISOString(),
              };
            } catch (error) {
              logger.error("❌ Login failed:", error);
              set.status = error.status || 500;
              return {
                success: false,
                error: error.message || "Login failed. Please try again.",
                timestamp: new Date().toISOString(),
              };
            }
          }
        )

        .get(
          "/profile",
          {
            response: {
              200: t.Object({
                success: t.Boolean(),
                user: userProfileSchema,
              }),
            },
          },
          async ({ user, set }) => {
            try {
              logger.info("👤 Profile request");
              const result = await getUserProfile({ user, set });

              if (!result.success) {
                set.status = result.code === "NOT_FOUND" ? 404 : 400;
                return result;
              }

              return {
                success: true,
                user: result.user,
                timestamp: new Date().toISOString(),
              };
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

        .put(
          "/profile",
          {
            body: updateProfileSchema,
            response: {
              200: t.Object({
                success: t.Boolean(),
                user: userProfileSchema,
              }),
            },
          },
          async ({ user, body, set }) => {
            try {
              logger.info("✏️ Profile update request");
              await authorize()(user);
              const result = await updateProfile({ user, body, set });

              if (!result.success) {
                set.status =
                  result.code === "NOT_FOUND"
                    ? 404
                    : result.code === "UNAUTHORIZED"
                    ? 401
                    : result.code === "CONFLICT"
                    ? 409
                    : 400;
                return result;
              }

              return {
                success: true,
                user: result.user,
                message: result.message,
                timestamp: new Date().toISOString(),
              };
            } catch (error) {
              logger.error("❌ Profile update failed:", error);
              set.status = error.status || 400;
              return {
                success: false,
                error: error.message || "Failed to update profile",
                timestamp: new Date().toISOString(),
              };
            }
          }
        )

        // Account verification routes
        .post(
          "/verify-email",
          {
            body: t.Object({
              email: t.String({ format: "email" }),
              token: t.String(),
            }),
            response: {
              200: t.Object({
                success: t.Boolean(),
                message: t.String(),
              }),
            },
          },
          async ({ body, set }) => {
            try {
              logger.info("✉️ Email verification attempt");
              const result = await verifyEmail({ body, set });

              if (!result.success) {
                set.status =
                  result.code === "VALIDATION_ERROR"
                    ? 400
                    : result.code === "NOT_FOUND"
                    ? 404
                    : result.code === "TIMEOUT_ERROR"
                    ? 504
                    : 500;
                return result;
              }

              return result;
            } catch (error) {
              logger.error("❌ Email verification failed:", error);
              set.status = error.status || 400;
              return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString(),
              };
            }
          }
        )

        // Password reset routes
        .post(
          "/reset-password-request",
          {
            body: t.Object({
              email: t.String({ format: "email" }),
            }),
            response: {
              200: t.Object({
                success: t.Boolean(),
                message: t.String(),
              }),
            },
          },
          async ({ body, set }) => {
            try {
              logger.info("🔑 Password reset requested");
              const result = await requestPasswordReset({
                email: body.email,
                set,
              });

              // Even for errors we return success:true for security reasons
              // to avoid email enumeration attacks
              return result;
            } catch (error) {
              logger.error("❌ Password reset request failed:", error);
              set.status = error.status || 400;
              return {
                success: false,
                error:
                  error.message || "Failed to process password reset request",
                timestamp: new Date().toISOString(),
              };
            }
          }
        )

        .post(
          "/reset-password/:token",
          {
            params: t.Object({
              token: t.String(),
            }),
            body: t.Object({
              password: t.String({ minLength: 8 }),
            }),
            response: {
              200: t.Object({
                success: t.Boolean(),
                message: t.String(),
              }),
            },
          },
          async ({ params, body, set }) => {
            try {
              logger.info("🔑 Password reset attempt");
              const result = await resetPassword({
                body: { token: params.token, password: body.password },
                set,
              });

              if (!result.success) {
                set.status =
                  result.code === "VALIDATION_ERROR"
                    ? 400
                    : result.code === "NOT_FOUND"
                    ? 404
                    : result.code === "TIMEOUT_ERROR"
                    ? 504
                    : 500;
                return result;
              }

              return result;
            } catch (error) {
              logger.error("❌ Password reset failed:", error);
              set.status = error.status || 400;
              return {
                success: false,
                error: error.message || "Failed to reset password",
                timestamp: new Date().toISOString(),
              };
            }
          }
        )
    );
  });
}
