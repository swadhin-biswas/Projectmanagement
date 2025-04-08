import crypto from "crypto";
import mongoose from "mongoose";
import connectDatabase from "../config/database.js";
import { Student, Supervisor, User } from "../models/User.js";
import {
  ConflictError,
  DatabaseError,
  UnauthorizedError,
  ValidationError,
} from "../utils/errors.js";
import { generateToken } from "../utils/generateToken.js";
import logger from "../utils/logger.js";
import { validateLogin, validateRegistration } from "../utils/validation.js";

// Helper function to check database connection
const checkDatabaseConnection = async () => {
  try {
    await connectDatabase();

    // Verify connection state after attempting connection
    const connectionState = mongoose.connection.readyState;
    logger.info(`MongoDB connection state: ${connectionState}`);

    if (connectionState !== 1) {
      throw new DatabaseError(
        `Database not connected. Connection state: ${connectionState}`
      );
    }
  } catch (error) {
    logger.error("Database connection error:", error);
    throw new DatabaseError("Database connection failed. Please try again.");
  }
};

// Helper function to generate a student ID
const generateStudentId = async () => {
  const currentYear = new Date().getFullYear().toString().slice(-2);
  const prefix = `S${currentYear}-`;
  const latestStudent = await Student.findOne().sort({ studentId: -1 });

  let nextNumber = 1000;
  if (latestStudent && latestStudent.studentId.startsWith(prefix)) {
    const currentNumber = parseInt(
      latestStudent.studentId.replace(prefix, ""),
      10
    );
    nextNumber = currentNumber + 1;
  }

  return `${prefix}${nextNumber}`;
};

// Helper function to generate a supervisor ID
const generateSupervisorId = async () => {
  const currentYear = new Date().getFullYear().toString().slice(-2);
  const prefix = `SUP${currentYear}-`;
  const latestSupervisor = await Supervisor.findOne().sort({
    supervisorId: -1,
  });

  let nextNumber = 100;
  if (latestSupervisor && latestSupervisor.supervisorId.startsWith(prefix)) {
    const currentNumber = parseInt(
      latestSupervisor.supervisorId.replace(prefix, ""),
      10
    );
    nextNumber = currentNumber + 1;
  }

  return `${prefix}${nextNumber}`;
};

// Register user with fixed error handling and status codes
export const registerUser = async ({ body, set }) => {
  try {
    // Ensure DB is connected before anything else
    await checkDatabaseConnection();
    logger.info(
      `MongoDB connection verified. State: ${mongoose.connection.readyState}`
    );

    // Test argon2 functionality
    try {
      const argon2 = await import("@node-rs/argon2");
      const testHash = await argon2.hash("test");
      logger.info("Argon2 hashing verified to be working correctly");
    } catch (argonError) {
      logger.error("Argon2 hashing error:", argonError);
      if (set) set.status(500);
      return {
        success: false,
        error: "Server configuration error. Please contact support.",
        timestamp: new Date().toISOString(),
      };
    }

    // Validate registration data
    const validationResult = validateRegistration(body);
    if (validationResult.errors) {
      if (set) set.status(400);
      return {
        success: false,
        error: validationResult.errors[0].message,
        field: validationResult.errors[0].field,
        timestamp: new Date().toISOString(),
      };
    }

    const {
      email,
      password,
      fullName,
      role,
      department,
      specialization,
      studentId,
    } = body;

    // Check for existing user
    try {
      logger.info(`Checking for existing user with email: ${email}`);
      const existingUser = await User.findOne({ email }).maxTimeMS(5000);

      if (existingUser) {
        logger.warn(`Email already registered: ${email}`);
        if (set) set.status(409);
        return {
          success: false,
          error: "Email already registered",
          timestamp: new Date().toISOString(),
        };
      }

      logger.info(
        `No existing user found with email: ${email}. Proceeding with registration.`
      );
    } catch (error) {
      if (error instanceof ConflictError) {
        if (set) set.status(409);
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        };
      }

      logger.error("Error checking for existing user:", error);
      if (set) set.status(503);
      return {
        success: false,
        error: "Failed to check for existing user. Please try again.",
        timestamp: new Date().toISOString(),
      };
    }

    // Create user object
    logger.info(`Creating new user object for: ${email}`);
    const user = new User({
      email,
      password,
      fullName,
      role,
      department,
      isApproved: role === "student",
      status: role === "student" ? "active" : "pending",
      isEmailVerified: true,
    });

    try {
      // Log the connection state right before saving
      logger.info(
        `MongoDB connection state before save: ${mongoose.connection.readyState}`
      );
      logger.info(`About to save user to database: ${user.email}`);

      const savedUser = await Promise.race([
        user.save(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Database operation timed out")),
            10000
          )
        ),
      ]);

      logger.info(
        `User successfully saved to database. ID: ${savedUser._id}, Email: ${savedUser.email}`
      );

      // Create role-specific profile
      if (role === "student") {
        const finalStudentId = studentId || (await generateStudentId());
        logger.info(`Creating student profile with ID: ${finalStudentId}`);

        try {
          const student = new Student({
            user: savedUser._id,
            studentId: finalStudentId,
          });

          await student.save();
          logger.info(
            `Student profile created successfully: ${finalStudentId}`
          );
        } catch (studentError) {
          logger.error(
            `Failed to create student profile: ${studentError.message}`,
            studentError
          );
          // Continue execution - user is created but student profile failed
          // We could consider rolling back the user here
        }
      } else if (role === "supervisor") {
        if (!specialization) {
          if (set) set.status(400);
          return {
            success: false,
            error: "Specialization is required for supervisors",
            field: "specialization",
            timestamp: new Date().toISOString(),
          };
        }

        const supervisorId = await generateSupervisorId();
        logger.info(`Creating supervisor profile with ID: ${supervisorId}`);

        try {
          const supervisor = new Supervisor({
            user: savedUser._id,
            supervisorId,
            specialization,
          });

          await supervisor.save();
          logger.info(
            `Supervisor profile created successfully: ${supervisorId}`
          );
        } catch (supervisorError) {
          logger.error(
            `Failed to create supervisor profile: ${supervisorError.message}`,
            supervisorError
          );
          // Continue execution - user is created but supervisor profile failed
        }
      }

      const token = role === "student" ? generateToken(savedUser._id) : null;

      logger.info("New user registered successfully", {
        userId: savedUser._id,
        email: savedUser.email,
        role: savedUser.role,
      });

      if (set) set.status(201);
      return {
        success: true,
        message:
          role === "supervisor"
            ? "Registration successful. Your account will be reviewed by an administrator."
            : "Registration successful.",
        token,
        user: {
          _id: savedUser._id,
          fullName: savedUser.fullName,
          email: savedUser.email,
          role: savedUser.role,
          department: savedUser.department,
          isApproved: savedUser.isApproved,
          status: savedUser.status,
          isEmailVerified: savedUser.isEmailVerified,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (saveError) {
      logger.error(
        `Error during user save operation: ${saveError.message}`,
        saveError
      );

      if (saveError.name === "ValidationError") {
        logger.error("Validation error during registration:", saveError);
        if (set) set.status(400);
        const firstErrorField = Object.keys(saveError.errors)[0];
        const firstErrorMessage = saveError.errors[firstErrorField].message;
        return {
          success: false,
          error: firstErrorMessage,
          field: firstErrorField,
          timestamp: new Date().toISOString(),
        };
      }

      if (saveError.code === 11000) {
        const field = Object.keys(saveError.keyPattern)[0];
        logger.error(`Duplicate ${field} error during registration`);
        if (set) set.status(409);
        return {
          success: false,
          error: `This ${field} is already registered`,
          field,
          timestamp: new Date().toISOString(),
        };
      }

      if (saveError.message.includes("timed out")) {
        logger.error("Registration timed out:", saveError);
        if (set) set.status(504);
        return {
          success: false,
          error: "Registration request timed out. Please try again.",
          timestamp: new Date().toISOString(),
        };
      }

      logger.error("Error saving user during registration:", saveError);
      if (set) set.status(500);
      return {
        success: false,
        error: "Failed to complete registration. Please try again.",
        timestamp: new Date().toISOString(),
      };
    }
  } catch (error) {
    logger.error("Registration error:", error);

    if (error instanceof ValidationError) {
      if (set) set.status(400);
      return {
        success: false,
        error: error.message,
        field: error.field,
        timestamp: new Date().toISOString(),
      };
    } else if (error instanceof ConflictError) {
      if (set) set.status(409);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    } else if (error instanceof DatabaseError) {
      if (set) set.status(503);
      return {
        success: false,
        error: "Service temporarily unavailable. Please try again later.",
        timestamp: new Date().toISOString(),
      };
    }

    // Ensure status code is always set for any error
    if (set) set.status(error.status || 500);
    return {
      success: false,
      error: error.message || "Registration failed. Please try again.",
      timestamp: new Date().toISOString(),
    };
  }
};

export const loginUser = async ({ body, set }) => {
  try {
    await checkDatabaseConnection();
    validateLogin(body);

    const { email, password } = body;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Database operation timed out")), 5000)
    );

    // Find user with timeout safety
    logger.info(`Login attempt for user: ${email}`);
    const userPromise = User.findOne({ email })
      .select("+password")
      .maxTimeMS(3000)
      .exec();

    const user = await Promise.race([userPromise, timeoutPromise]);

    if (!user) {
      logger.warn(`Login failed: No user found with email ${email}`);
      if (set) set.status = 401;
      return {
        success: false,
        error: "Invalid email or password",
        timestamp: new Date().toISOString(),
      };
    }

    // Verify password
    logger.info(`Verifying password for user: ${email}`);
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      logger.warn(`Login failed: Invalid password for user ${email}`);
      if (set) set.status = 401;
      return {
        success: false,
        error: "Invalid email or password",
        timestamp: new Date().toISOString(),
      };
    }

    // Generate token
    const token = generateToken(user._id);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Remove sensitive data from response
    const userResponse = user.toObject();
    delete userResponse.password;

    logger.info(`Login successful for user: ${email}`);

    // Return the response in a flattened format that matches what the route handler expects
    return {
      success: true,
      token,
      user: {
        _id: userResponse._id,
        fullName: userResponse.fullName,
        email: userResponse.email,
        role: userResponse.role,
        department: userResponse.department,
        isApproved: userResponse.isApproved,
        isEmailVerified: userResponse.isEmailVerified,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error("Login error:", error);

    // Set specific status codes based on error type
    if (error instanceof ValidationError) {
      if (set) set.status = 400;
    } else if (error instanceof UnauthorizedError) {
      if (set) set.status = 401;
    } else if (error instanceof DatabaseError) {
      if (set) set.status = 503;
    } else if (error.message.includes("timed out")) {
      if (set) set.status = 504;
    } else {
      if (set) set.status = error.status || 500;
    }

    return {
      success: false,
      error: error.message || "Login failed. Please try again.",
      timestamp: new Date().toISOString(),
    };
  }
};

// Get user profile with improved timeout handling
export const getUserProfile = async ({ user, set }) => {
  try {
    checkDatabaseConnection();

    if (!user?._id) {
      throw new UnauthorizedError("Not authenticated");
    }

    // Set a shorter timeout for Mongoose operations
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Database operation timed out")), 3000)
    );

    const userDataPromise = User.findById(user._id)
      .select("-password")
      .lean()
      .maxTimeMS(3000)
      .exec();

    const userData = await Promise.race([userDataPromise, timeoutPromise]);

    if (!userData) {
      throw new ValidationError("User not found");
    }

    return {
      success: true,
      user: userData,
    };
  } catch (error) {
    logger.error("Profile fetch error:", error);

    // Handle specific error types
    if (error instanceof UnauthorizedError) {
      if (set) set.status(401);
      return {
        success: false,
        error: error.message,
        code: "UNAUTHORIZED",
      };
    } else if (error instanceof ValidationError) {
      if (set) set.status(404);
      return {
        success: false,
        error: error.message,
        code: "NOT_FOUND",
      };
    } else if (error instanceof DatabaseError) {
      if (set) set.status(503);
      return {
        success: false,
        error: "Service temporarily unavailable. Please try again later.",
        code: "DB_ERROR",
      };
    } else if (error.message.includes("timed out")) {
      if (set) set.status(504);
      return {
        success: false,
        error: "Request timed out. Please try again later.",
        code: "TIMEOUT_ERROR",
      };
    }

    // Generic error handler
    if (set) set.status(500);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
      code: "INTERNAL_ERROR",
    };
  }
};

// Update user profile with improved error handling
export const updateProfile = async ({ user, body, set }) => {
  try {
    checkDatabaseConnection();

    if (!user?._id) {
      throw new UnauthorizedError("Not authenticated");
    }

    // Validate the update data
    const { fullName, email, department, specialization } = body;

    // Check fields that can be updated
    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (email) updateData.email = email;
    if (department) updateData.department = department;

    // Set a shorter timeout for Mongoose operations
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Database operation timed out")), 5000)
    );

    // Check if email is being changed and is already taken
    if (email && email !== user.email) {
      const emailExistsPromise = User.findOne({ email, _id: { $ne: user._id } })
        .maxTimeMS(3000)
        .exec();
      const emailExists = await Promise.race([
        emailExistsPromise,
        timeoutPromise,
      ]);

      if (emailExists) {
        throw new ConflictError("Email already in use by another account");
      }
    }

    // Update the user profile
    const updatedUserPromise = User.findByIdAndUpdate(
      user._id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .select("-password")
      .maxTimeMS(3000)
      .exec();

    const updatedUser = await Promise.race([
      updatedUserPromise,
      timeoutPromise,
    ]);

    if (!updatedUser) {
      throw new ValidationError("User not found");
    }

    // Handle role-specific updates
    if (user.role === "supervisor" && specialization) {
      const updateSupervisorPromise = Supervisor.findOneAndUpdate(
        { user: user._id },
        { specialization },
        { new: true }
      )
        .maxTimeMS(3000)
        .exec();

      await Promise.race([updateSupervisorPromise, timeoutPromise]);
    }

    logger.info("User profile updated", { userId: user._id });

    return {
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    };
  } catch (error) {
    logger.error("Profile update error:", error);

    // Handle specific error types
    if (error instanceof UnauthorizedError) {
      if (set) set.status(401);
      return {
        success: false,
        error: error.message,
        code: "UNAUTHORIZED",
      };
    } else if (error instanceof ValidationError) {
      if (set) set.status(400);
      return {
        success: false,
        error: error.message,
        code: "VALIDATION_ERROR",
      };
    } else if (error instanceof ConflictError) {
      if (set) set.status(409);
      return {
        success: false,
        error: error.message,
        code: "CONFLICT_ERROR",
      };
    } else if (error instanceof DatabaseError) {
      if (set) set.status(503);
      return {
        success: false,
        error: "Service temporarily unavailable. Please try again later.",
        code: "DB_ERROR",
      };
    } else if (error.message.includes("timed out")) {
      if (set) set.status(504);
      return {
        success: false,
        error: "Request timed out. Please try again later.",
        code: "TIMEOUT_ERROR",
      };
    }

    // Generic error handler
    if (set) set.status(500);
    return {
      success: false,
      error:
        "An unexpected error occurred while updating profile. Please try again.",
      code: "INTERNAL_ERROR",
    };
  }
};

// Reset password implementation with improved error handling
export const resetPassword = async ({ body, set }) => {
  try {
    checkDatabaseConnection();

    const { email, token, newPassword } = body;

    if (!email || !token || !newPassword) {
      throw new ValidationError("Email, token, and new password are required");
    }

    if (newPassword.length < 8) {
      throw new ValidationError("Password must be at least 8 characters long");
    }

    // Set a shorter timeout for Mongoose operations
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Database operation timed out")), 5000)
    );

    // Find the user by email
    const userPromise = User.findOne({ email, resetPasswordToken: token })
      .maxTimeMS(3000)
      .exec();
    const user = await Promise.race([userPromise, timeoutPromise]);

    if (!user) {
      throw new ValidationError("Invalid or expired password reset token");
    }

    // Check if token is expired (typically 1 hour)
    if (user.resetPasswordExpires && user.resetPasswordExpires < Date.now()) {
      throw new ValidationError("Password reset token has expired");
    }

    // Update the password
    user.password = newPassword;
    // Clear the reset token and expiration
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    // Save the updated user
    const saveUserPromise = user.save({ maxTimeMS: 3000 });
    await Promise.race([saveUserPromise, timeoutPromise]);

    logger.info("Password reset successful", { userId: user._id });

    return {
      success: true,
      message:
        "Password has been reset successfully. You can now log in with your new password.",
    };
  } catch (error) {
    logger.error("Password reset error:", error);

    // Handle specific error types
    if (error instanceof ValidationError) {
      if (set) set.status(400);
      return {
        success: false,
        error: error.message,
        code: "VALIDATION_ERROR",
      };
    } else if (error instanceof DatabaseError) {
      if (set) set.status(503);
      return {
        success: false,
        error: "Service temporarily unavailable. Please try again later.",
        code: "DB_ERROR",
      };
    } else if (error.message.includes("timed out")) {
      if (set) set.status(504);
      return {
        success: false,
        error: "Request timed out. Please try again later.",
        code: "TIMEOUT_ERROR",
      };
    }

    // Generic error handler
    if (set) set.status(500);
    return {
      success: false,
      error:
        "An unexpected error occurred during password reset. Please try again.",
      code: "INTERNAL_ERROR",
    };
  }
};

// Create a password reset token and send email with the reset link
export const forgotPassword = async ({ body, set }) => {
  try {
    checkDatabaseConnection();

    const { email } = body;

    if (!email) {
      throw new ValidationError("Email is required");
    }

    // Set a shorter timeout for Mongoose operations
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Database operation timed out")), 5000)
    );

    // Find the user by email
    const userPromise = User.findOne({ email }).maxTimeMS(3000).exec();
    const user = await Promise.race([userPromise, timeoutPromise]);

    if (!user) {
      // For security reasons, don't reveal if the email exists
      return {
        success: true,
        message:
          "If your email exists in our system, you will receive a password reset link shortly.",
      };
    }

    // Generate a reset token (you may want to use a more secure method)
    const resetToken = crypto.randomBytes(20).toString("hex");

    // Set token and expiration (1 hour)
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

    // Save the updated user
    const saveUserPromise = user.save({ maxTimeMS: 3000 });
    await Promise.race([saveUserPromise, timeoutPromise]);

    // Here you would typically send an email with the reset link
    // For now, just logging it
    logger.info("Password reset requested", {
      userId: user._id,
      resetToken,
      resetLink: `https://your-app.com/reset-password?token=${resetToken}&email=${email}`,
    });

    return {
      success: true,
      message:
        "If your email exists in our system, you will receive a password reset link shortly.",
    };
  } catch (error) {
    logger.error("Forgot password error:", error);

    // Handle specific error types
    if (error instanceof ValidationError) {
      if (set) set.status(400);
      return {
        success: false,
        error: error.message,
        code: "VALIDATION_ERROR",
      };
    } else if (error instanceof DatabaseError) {
      if (set) set.status(503);
      return {
        success: false,
        error: "Service temporarily unavailable. Please try again later.",
        code: "DB_ERROR",
      };
    } else if (error.message.includes("timed out")) {
      if (set) set.status(504);
      return {
        success: false,
        error: "Request timed out. Please try again later.",
        code: "TIMEOUT_ERROR",
      };
    }

    // Generic error handler
    if (set) set.status(500);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
      code: "INTERNAL_ERROR",
    };
  }
};

// Request password reset - separate handler for frontend API
export const requestPasswordReset = async ({ body, set }) => {
  try {
    checkDatabaseConnection();

    const { email } = body;

    if (!email) {
      throw new ValidationError("Email is required");
    }

    // Set a shorter timeout for Mongoose operations
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Database operation timed out")), 5000)
    );

    // Find the user by email
    const userPromise = User.findOne({ email }).maxTimeMS(3000).exec();
    const user = await Promise.race([userPromise, timeoutPromise]);

    if (!user) {
      // For security reasons, don't reveal if the email exists
      // Return success even if user doesn't exist
      return {
        success: true,
        message:
          "If your email exists in our system, you will receive a password reset link shortly.",
      };
    }

    // Generate a reset token
    const resetToken = crypto.randomBytes(20).toString("hex");

    // Set token and expiration (1 hour)
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

    // Save the updated user
    const saveUserPromise = user.save({ maxTimeMS: 3000 });
    await Promise.race([saveUserPromise, timeoutPromise]);

    // Here you would typically send an email with the reset link
    // For now, just logging it
    logger.info("Password reset requested", {
      userId: user._id,
      resetToken,
      resetLink: `https://your-app.com/reset-password?token=${resetToken}&email=${email}`,
    });

    return {
      success: true,
      message:
        "If your email exists in our system, you will receive a password reset link shortly.",
    };
  } catch (error) {
    logger.error("Password reset request error:", error);

    // Handle specific error types
    if (error instanceof ValidationError) {
      if (set) set.status(400);
      return {
        success: false,
        error: error.message,
        code: "VALIDATION_ERROR",
      };
    } else if (error instanceof DatabaseError) {
      if (set) set.status(503);
      return {
        success: false,
        error: "Service temporarily unavailable. Please try again later.",
        code: "DB_ERROR",
      };
    } else if (error.message.includes("timed out")) {
      if (set) set.status(504);
      return {
        success: false,
        error: "Request timed out. Please try again later.",
        code: "TIMEOUT_ERROR",
      };
    }

    // Generic error handler
    if (set) set.status(500);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
      code: "INTERNAL_ERROR",
    };
  }
};

// Verify user email with token
export const verifyEmail = async ({ body, set }) => {
  try {
    checkDatabaseConnection();

    const { email, token } = body;

    if (!email || !token) {
      throw new ValidationError("Email and verification token are required");
    }

    // Set a shorter timeout for Mongoose operations
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Database operation timed out")), 5000)
    );

    // Find the user by email and verification token
    const userPromise = User.findOne({
      email,
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() },
    })
      .maxTimeMS(3000)
      .exec();

    const user = await Promise.race([userPromise, timeoutPromise]);

    if (!user) {
      throw new ValidationError("Invalid or expired verification token");
    }

    // Update user verification status
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;

    // Save the updated user
    const saveUserPromise = user.save({ maxTimeMS: 3000 });
    await Promise.race([saveUserPromise, timeoutPromise]);

    logger.info("Email verification successful", { userId: user._id });

    return {
      success: true,
      message:
        "Email verified successfully. You can now log in with your credentials.",
    };
  } catch (error) {
    logger.error("Email verification error:", error);

    // Handle specific error types
    if (error instanceof ValidationError) {
      if (set) set.status(400);
      return {
        success: false,
        error: error.message,
        code: "VALIDATION_ERROR",
      };
    } else if (error instanceof DatabaseError) {
      if (set) set.status(503);
      return {
        success: false,
        error: "Service temporarily unavailable. Please try again later.",
        code: "DB_ERROR",
      };
    } else if (error.message.includes("timed out")) {
      if (set) set.status(504);
      return {
        success: false,
        error: "Request timed out. Please try again later.",
        code: "TIMEOUT_ERROR",
      };
    }

    // Generic error handler
    if (set) set.status(500);
    return {
      success: false,
      error:
        "An unexpected error occurred during email verification. Please try again.",
      code: "INTERNAL_ERROR",
    };
  }
};

// Send email verification token
export const sendVerificationEmail = async ({ user, set }) => {
  try {
    checkDatabaseConnection();

    if (!user?._id) {
      throw new UnauthorizedError("Not authenticated");
    }

    // Set a shorter timeout for Mongoose operations
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Database operation timed out")), 5000)
    );

    // Find the user
    const userPromise = User.findById(user._id).maxTimeMS(3000).exec();

    const userData = await Promise.race([userPromise, timeoutPromise]);

    if (!userData) {
      throw new ValidationError("User not found");
    }

    // Check if email is already verified
    if (userData.isEmailVerified) {
      return {
        success: true,
        message: "Email is already verified.",
      };
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(20).toString("hex");

    // Set token and expiration (24 hours)
    userData.emailVerificationToken = verificationToken;
    userData.emailVerificationExpires = Date.now() + 86400000; // 24 hours

    // Save the updated user
    const saveUserPromise = userData.save({ maxTimeMS: 3000 });
    await Promise.race([saveUserPromise, timeoutPromise]);

    // Here you would typically send an email with the verification link
    // For now, just logging it
    logger.info("Email verification requested", {
      userId: userData._id,
      email: userData.email,
      verificationToken,
      verificationLink: `https://your-app.com/verify-email?token=${verificationToken}&email=${userData.email}`,
    });

    return {
      success: true,
      message:
        "Verification email sent successfully. Please check your email inbox.",
    };
  } catch (error) {
    logger.error("Send verification email error:", error);

    // Handle specific error types
    if (error instanceof UnauthorizedError) {
      if (set) set.status(401);
      return {
        success: false,
        error: error.message,
        code: "UNAUTHORIZED",
      };
    } else if (error instanceof ValidationError) {
      if (set) set.status(404);
      return {
        success: false,
        error: error.message,
        code: "NOT_FOUND",
      };
    } else if (error instanceof DatabaseError) {
      if (set) set.status(503);
      return {
        success: false,
        error: "Service temporarily unavailable. Please try again later.",
        code: "DB_ERROR",
      };
    } else if (error.message.includes("timed out")) {
      if (set) set.status(504);
      return {
        success: false,
        error: "Request timed out. Please try again later.",
        code: "TIMEOUT_ERROR",
      };
    }

    // Generic error handler
    if (set) set.status(500);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
      code: "INTERNAL_ERROR",
    };
  }
};
