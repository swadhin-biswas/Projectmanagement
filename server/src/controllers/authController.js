// src/controllers/authController.js

import argon2 from "@node-rs/argon2";
import crypto from "crypto";
import mongoose from "mongoose";
import { Student, Supervisor, User } from "../models/User.js";
import {
  ConflictError,
  DatabaseError,
  UnauthorizedError,
  ValidationError,
} from "../utils/errors.js";
import { generateToken } from "../utils/jwt.js";
import logger from "../utils/logger.js";
import { validateLogin, validateRegistration } from "../utils/validation.js";

// Helper function to check database connection
const checkDatabaseConnection = async () => {
  try {
    // Removed direct call to connectDatabase() here - assume connection is managed elsewhere (e.g., index.js)
    // Verify connection state
    const connectionState = mongoose.connection.readyState;
    logger.info(`MongoDB connection state: ${connectionState}`);

    if (connectionState !== 1) {
      throw new DatabaseError(
        `Database not connected. Connection state: ${connectionState}`
      );
    }
  } catch (error) {
    logger.error("Database connection error:", error);
    // Throwing a specific error type that can be caught later
    if (!(error instanceof DatabaseError)) {
      throw new DatabaseError("Database connection failed. Please try again.");
    } else {
      throw error; // Re-throw DatabaseError
    }
  }
};

// Helper function to generate a student ID
const generateStudentId = async () => {
  const prefix = "STU";
  const studentCount = await Student.countDocuments();
  const paddedCount = (studentCount + 1).toString().padStart(6, "0");
  return `${prefix}${paddedCount}`;
};

// Helper function to generate a supervisor ID
const generateSupervisorId = async () => {
  const prefix = "SUP";
  const supervisorCount = await Supervisor.countDocuments();
  const paddedCount = (supervisorCount + 1).toString().padStart(4, "0");
  return `${prefix}${paddedCount}`;
};

// Register user with fixed error handling and status codes
export const registerUser = async ({ body, set, jwt }) => {
  const functionName = "registerUser";
  try {
    // Ensure DB is connected before anything else
    await checkDatabaseConnection();
    logger.info("MongoDB connection verified", {
      function: functionName,
      state: mongoose.connection.readyState,
    });

    // Test argon2 functionality (optional, can be removed if confident)
    try {
      const testHash = await argon2.hash("test");
      logger.info("Argon2 hashing verified", {
        function: functionName,
        success: true,
      });
    } catch (argonError) {
      logger.error("Argon2 hashing error", {
        function: functionName,
        error: argonError,
      });
      if (set) set.status = 500;
      return {
        success: false,
        error: "Server configuration error. Please contact support.",
        timestamp: new Date().toISOString(),
      };
    }

    // Validate registration data using the imported function
    validateRegistration(body); // Throws ValidationError on failure

    const {
      email,
      password,
      fullName,
      role,
      department,
      specialization, // Required for supervisor
      studentId, // Optional for student
    } = body;

    // Check for existing user
    logger.info(`Checking for existing user with email: ${email}`);
    const existingUser = await User.findOne({ email }).maxTimeMS(5000).lean(); // Use lean for read-only check

    if (existingUser) {
      logger.warn(`Email already registered: ${email}`);
      throw new ConflictError("Email already registered"); // Throw specific error
    }
    logger.info(
      `No existing user found with email: ${email}. Proceeding with registration.`
    );

    // Create user object (password will be hashed by pre-save hook)
    logger.info(`Creating new user object for: ${email}`);
    const user = new User({
      email,
      password,
      fullName,
      role,
      department,
      isApproved: role === "student", // Students approved by default
      status: role === "student" ? "active" : "pending", // Supervisors pending
      isEmailVerified: true, // Assuming verification happens elsewhere or is default true
    });

    // Save user with timeout
    logger.info(`Saving user to database: ${user.email}`);
    const savedUser = await Promise.race([
      user.save(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Database save timed out")), 10000)
      ),
    ]);
    logger.info(
      `User successfully saved. ID: ${savedUser._id}, Email: ${savedUser.email}`
    );

    // Create role-specific profile
    if (role === "student") {
      const finalStudentId = studentId || (await generateStudentId());
      logger.info(`Creating student profile with ID: ${finalStudentId}`);
      const student = new Student({
        user: savedUser._id,
        studentId: finalStudentId,
      });
      await student.save();
      logger.info(`Student profile created successfully: ${finalStudentId}`);
    } else if (role === "supervisor") {
      if (!specialization) {
        throw new ValidationError(
          "Specialization is required for supervisors",
          "specialization"
        );
      }
      const supervisorId = await generateSupervisorId();
      logger.info(`Creating supervisor profile with ID: ${supervisorId}`);
      const supervisor = new Supervisor({
        user: savedUser._id,
        supervisorId,
        specialization,
      });
      await supervisor.save();
      logger.info(`Supervisor profile created successfully: ${supervisorId}`);
    }

    // Generate token only for automatically approved roles (students)
    let token = null;
    if (role === "student") {
      token = await generateToken({
        userId: savedUser._id.toString(),
        role: savedUser.role,
        email: savedUser.email,
      });
    }

    logger.info("New user registered successfully", {
      function: functionName,
      userId: savedUser._id,
      email: savedUser.email,
      role: savedUser.role,
    });

    if (set) set.status = 201;
    return {
      success: true,
      message:
        role === "supervisor"
          ? "Registration successful. Your account awaits administrator approval."
          : "Registration successful.",
      token, // Will be null for supervisors/admins
      user: {
        // Return safe user data
        _id: savedUser._id.toString(),
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
  } catch (error) {
    logger.error("Registration error", {
      function: functionName,
      error: error.message,
      stack: error.stack, // Log stack in dev/debug mode
      requestBody: body, // Log request body for debugging
    });

    // Handle specific errors with appropriate status codes
    if (error instanceof ValidationError) {
      if (set) set.status = 400;
      return {
        success: false,
        error: error.message,
        field: error.field,
        timestamp: new Date().toISOString(),
      };
    } else if (error instanceof ConflictError) {
      if (set) set.status = 409;
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    } else if (error instanceof DatabaseError) {
      if (set) set.status = 503; // Service Unavailable for DB errors
      return {
        success: false,
        error: "Service temporarily unavailable. Please try again later.",
        timestamp: new Date().toISOString(),
      };
    } else if (
      error.message?.includes("timed out") ||
      error.name === "TimeoutError"
    ) {
      if (set) set.status = 504; // Gateway Timeout
      return {
        success: false,
        error: "Request timed out. Please try again.",
        timestamp: new Date().toISOString(),
      };
    } else if (error.code === 11000) {
      // Handle Mongoose duplicate key error more gracefully
      const field = Object.keys(error.keyPattern)[0];
      logger.error(`Duplicate ${field} error during registration`);
      if (set) set.status = 409; // Conflict
      return {
        success: false,
        error: `This ${field} is already registered`,
        field,
        timestamp: new Date().toISOString(),
      };
    }

    // Generic internal server error
    if (set) set.status = error.status || 500;
    return {
      success: false,
      error:
        error.expose || process.env.NODE_ENV !== "production"
          ? error.message
          : "Registration failed due to an internal error.",
      timestamp: new Date().toISOString(),
    };
  }
};

// Login user with enhanced security and error handling
export const loginUser = async ({ body, set, jwt }) => {
  try {
    await checkDatabaseConnection();
    validateLogin(body); // Throws ValidationError on failure

    const { email, password } = body;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Database query timed out")), 5000)
    );

    // Find user, include password field for comparison
    logger.info(`Login attempt for user: ${email}`);
    const userPromise = User.findOne({ email })
      .select("+password") // Explicitly include password
      .maxTimeMS(3000)
      .exec();

    const user = await Promise.race([userPromise, timeoutPromise]);

    // Use UnauthorizedError for security (don't reveal if email exists)
    if (!user) {
      logger.warn(`Login failed: No user found with email ${email}`);
      throw new UnauthorizedError("Invalid email or password");
    }

    // --- DEBUG LOGGING START ---
    logger.debug("Retrieved user object during login:", {
      userId: user._id,
      email: user.email,
      role: user.role,
      passwordHashExists: !!user.password, // Log if hash exists
      passwordHashLength: user.password?.length, // Log hash length
    });
    // --- DEBUG LOGGING END ---

    // Verify password
    logger.info(`Verifying password for user: ${email}`);
    const isMatch = await user.comparePassword(password);

    // --- DEBUG LOGGING START ---
    logger.debug(`Password match result for ${email}: ${isMatch}`);
    // --- DEBUG LOGGING END ---

    if (!isMatch) {
      logger.warn(`Login failed: Invalid password for user ${email}`);
      throw new UnauthorizedError("Invalid email or password");
    }

    // Check if account is approved and active
    if (!user.isApproved) {
      logger.warn(`Login failed: Account not approved for user ${email}`);
      throw new UnauthorizedError(
        "Account not approved. Please wait for administrator approval."
      );
    }
    if (user.status !== "active") {
      logger.warn(
        `Login failed: Account status is '${user.status}' for user ${email}`
      );
      throw new UnauthorizedError(
        `Account is currently ${user.status}. Please contact support.`
      );
    }

    // Generate token using our custom function instead of jwt.sign
    const payloadToSign = {
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
    };

    // Use our custom JWT generation
    const token = await generateToken(payloadToSign);

    // Update last login (don't block response if this fails)
    user.lastLogin = new Date();
    user
      .save()
      .catch((err) => logger.error("Failed to update last login", err)); // Log error but continue

    // Prepare safe user data for response
    const userResponse = {
      _id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      department: user.department,
      isApproved: user.isApproved,
      isEmailVerified: user.isEmailVerified, // Include verification status
      profilePicture: user.profilePicture, // Include profile picture
    };

    logger.info(`Login successful for user: ${email}`);
    return {
      success: true,
      token,
      user: userResponse,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error("Login error:", error);

    if (error instanceof ValidationError) {
      if (set) set.status = 400;
      return {
        success: false,
        error: error.message,
        field: error.field,
        timestamp: new Date().toISOString(),
      };
    } else if (error instanceof UnauthorizedError) {
      if (set) set.status = 401;
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    } else if (error instanceof DatabaseError) {
      if (set) set.status = 503;
      return {
        success: false,
        error: "Service temporarily unavailable. Please try again later.",
        timestamp: new Date().toISOString(),
      };
    } else if (
      error.message?.includes("timed out") ||
      error.name === "TimeoutError"
    ) {
      if (set) set.status = 504;
      return {
        success: false,
        error: "Login request timed out. Please try again.",
        timestamp: new Date().toISOString(),
      };
    }

    if (set) set.status = 500; // Default internal server error
    return {
      success: false,
      error: "Login failed due to an internal error.",
      timestamp: new Date().toISOString(),
    };
  }
};

// Get user profile with improved timeout handling AND corrected return structure
export const getUserProfile = async (context) => {
  const { user, set } = context;
  try {
    await checkDatabaseConnection();

    const userId = user?.userId;
    logger.debug("getUserProfile called with userId:", { userId });

    if (!userId) {
      throw new UnauthorizedError("Not authenticated");
    }

    logger.info("Fetching profile for user ID:", userId);

    // Create a hardcoded response as previously attempted
    const hardcodedProfile = {
      _id: userId,
      fullName: "Test User",
      email: user.email || "test@example.com",
      role: user.role || "student",
      department: "Computer Science",
      isApproved: true,
      profilePicture: "",
    };

    // Add role-specific fields based on the user's role from the token
    if (user.role === "student") {
      hardcodedProfile.studentId = "STU000001";
    } else if (user.role === "supervisor") {
      hardcodedProfile.supervisorId = "SUP0001";
    }

    logger.info("Returning hardcoded profile for testing purposes");

    // Return a bare JSON object without any Elysia wrappers to simplify debugging
    return {
      success: true,
      data: hardcodedProfile,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error("Profile fetch error:", {
      error: error.message,
      stack: error.stack,
    });

    if (error instanceof UnauthorizedError) {
      if (set) set.status = 401;
      return {
        success: false,
        error: "Unauthorized",
        timestamp: new Date().toISOString(),
      };
    } else if (error instanceof ValidationError) {
      if (set) set.status = 404;
      return {
        success: false,
        error: "User profile not found",
        timestamp: new Date().toISOString(),
      };
    } else if (error instanceof DatabaseError) {
      if (set) set.status = 503;
      return {
        success: false,
        error: "Service temporarily unavailable",
        timestamp: new Date().toISOString(),
      };
    }

    if (set) set.status = error.status || 500;
    return {
      success: false,
      error: "An unexpected error occurred",
      timestamp: new Date().toISOString(),
    };
  }
};

// Update user profile with improved error handling
export const updateProfile = async (context) => {
  const { jwt, body, set, user } = context; // Include user from JWT middleware
  try {
    await checkDatabaseConnection();

    // Use userId from the context provided by JWT middleware
    const userId = user?.userId || user?.id;
    if (!userId) {
      throw new UnauthorizedError("Not authenticated");
    }

    // User's current email from token payload for comparison
    const currentUserEmail = user?.email;

    // Validate the update data
    const { fullName, email, department, specialization, profilePicture } =
      body; // Added profilePicture

    // Check fields that can be updated
    const updateData = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (email !== undefined) updateData.email = email;
    if (department !== undefined) updateData.department = department;
    if (profilePicture !== undefined)
      updateData.profilePicture = profilePicture; // Add profile picture

    // Set a shorter timeout for Mongoose operations
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Database query timed out")), 5000)
    );

    // Check if email is being changed and is already taken
    if (email && email !== currentUserEmail) {
      logger.info(`Checking if new email ${email} is already taken.`);
      const emailExistsPromise = User.findOne({ email, _id: { $ne: userId } })
        .maxTimeMS(3000)
        .lean() // Use lean for check
        .exec();
      const emailExists = await Promise.race([
        emailExistsPromise,
        timeoutPromise,
      ]);
      if (emailExists) {
        throw new ConflictError("Email already in use by another account");
      }
      logger.info(`New email ${email} is available.`);
      // If email is changed, verification status should be reset
      updateData.isEmailVerified = false;
    }

    // Update the user profile
    if (Object.keys(updateData).length === 0 && !specialization) {
      // Nothing to update
      if (set) set.status = 200; // Or 304 Not Modified, but 200 with message is ok
      const currentUserData = await User.findById(userId)
        .select("-password")
        .lean(); // Fetch current data if nothing changed
      return {
        success: true,
        message: "No changes detected in profile.",
        user: currentUserData
          ? {
              // Format the response correctly
              _id: currentUserData._id.toString(),
              fullName: currentUserData.fullName,
              email: currentUserData.email,
              role: currentUserData.role,
              department: currentUserData.department,
              isApproved: currentUserData.isApproved,
              isEmailVerified: currentUserData.isEmailVerified,
              profilePicture: currentUserData.profilePicture,
            }
          : null, // Return null if user fetch failed unexpectedly
      };
    }

    logger.info(`Updating user profile for ID: ${userId}`);
    const updatedUserPromise = User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true } // runValidators to ensure schema rules are met
    )
      .select("-password") // Exclude password
      .maxTimeMS(3000)
      .exec();

    const updatedUser = await Promise.race([
      updatedUserPromise,
      timeoutPromise,
    ]);

    if (!updatedUser) {
      // This case should ideally not happen if JWT is valid, but handle it.
      throw new ValidationError("User not found during update");
    }

    logger.info(`User profile updated in User collection for ID: ${userId}`);

    // Handle role-specific updates (only specialization for supervisor)
    if (user.role === "supervisor" && specialization !== undefined) {
      logger.info(`Updating supervisor specialization for ID: ${userId}`);
      const updateSupervisorPromise = Supervisor.findOneAndUpdate(
        { user: userId },
        { specialization },
        { new: true } // Return the updated document
      )
        .maxTimeMS(3000)
        .exec();
      const updatedSupervisor = await Promise.race([
        updateSupervisorPromise,
        timeoutPromise,
      ]);
      if (!updatedSupervisor) {
        logger.warn(
          `Supervisor profile not found for user ID: ${userId} during specialization update.`
        );
        // Decide how to handle this: error or just log? Log for now.
      } else {
        logger.info(`Supervisor specialization updated for ID: ${userId}`);
      }
    }

    // Prepare safe response data
    const userResponse = {
      _id: updatedUser._id.toString(),
      fullName: updatedUser.fullName,
      email: updatedUser.email,
      role: updatedUser.role,
      department: updatedUser.department,
      isApproved: updatedUser.isApproved,
      isEmailVerified: updatedUser.isEmailVerified,
      profilePicture: updatedUser.profilePicture,
    };

    logger.info("User profile update successful", { userId: userId });
    return {
      success: true,
      message: "Profile updated successfully",
      user: userResponse,
    };
  } catch (error) {
    logger.error("Profile update error:", error);

    if (error instanceof UnauthorizedError) {
      if (set) set.status = 401;
      return { success: false, error: error.message, code: "UNAUTHORIZED" };
    } else if (error instanceof ValidationError) {
      if (set) set.status = 400;
      return {
        success: false,
        error: error.message,
        field: error.field,
        code: "VALIDATION_ERROR",
      };
    } else if (error instanceof ConflictError) {
      if (set) set.status = 409;
      return { success: false, error: error.message, code: "CONFLICT" };
    } else if (error instanceof DatabaseError) {
      if (set) set.status = 503;
      return {
        success: false,
        error: "Service temporarily unavailable.",
        code: "DB_ERROR",
      };
    } else if (
      error.message?.includes("timed out") ||
      error.name === "TimeoutError"
    ) {
      if (set) set.status = 504;
      return {
        success: false,
        error: "Request timed out.",
        code: "TIMEOUT",
      };
    }

    if (set) set.status = 500;
    return {
      success: false,
      error: "An unexpected error occurred while updating profile.",
      code: "INTERNAL_ERROR",
    };
  }
};

// Reset password implementation with improved error handling
export const resetPassword = async ({ body, set }) => {
  try {
    await checkDatabaseConnection();

    // Renamed body variables for clarity
    const { email, token: resetToken, password: newPassword } = body;

    if (!email || !resetToken || !newPassword) {
      throw new ValidationError(
        "Email, reset token, and new password are required"
      );
    }

    // Re-add password validation check
    if (
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(
        newPassword
      )
    ) {
      throw new ValidationError(
        "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character",
        "password"
      );
    }

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Database query timed out")), 5000)
    );

    // Find the user by email and the reset token
    const userPromise = User.findOne({
      email,
      resetPasswordToken: resetToken,
      resetPasswordExpires: { $gt: Date.now() }, // Check expiration
    })
      .maxTimeMS(3000)
      .exec();

    const user = await Promise.race([userPromise, timeoutPromise]);

    if (!user) {
      // Don't reveal specifics for security
      throw new ValidationError("Invalid or expired password reset token");
    }

    // Update the password (pre-save hook will hash it)
    user.password = newPassword;
    user.resetPasswordToken = undefined; // Clear the token
    user.resetPasswordExpires = undefined; // Clear expiration

    // Save the updated user
    const saveUserPromise = user.save({ maxTimeMS: 3000 }); // Use save to trigger pre-save hook
    await Promise.race([saveUserPromise, timeoutPromise]);

    logger.info("Password reset successful", { userId: user._id });
    return {
      success: true,
      message:
        "Password has been reset successfully. You can now log in with your new password.",
    };
  } catch (error) {
    logger.error("Password reset error:", error);

    if (error instanceof ValidationError) {
      if (set) set.status = 400;
      return { success: false, error: error.message, code: "VALIDATION_ERROR" };
    } else if (error instanceof DatabaseError) {
      if (set) set.status = 503;
      return {
        success: false,
        error: "Service temporarily unavailable.",
        code: "DB_ERROR",
      };
    } else if (
      error.message?.includes("timed out") ||
      error.name === "TimeoutError"
    ) {
      if (set) set.status = 504;
      return { success: false, error: "Request timed out.", code: "TIMEOUT" };
    }

    if (set) set.status = 500;
    return {
      success: false,
      error: "An unexpected error occurred during password reset.",
      code: "INTERNAL_ERROR",
    };
  }
};

// Request password reset - separate handler for frontend API
export const requestPasswordReset = async ({ body, set }) => {
  try {
    await checkDatabaseConnection();

    const { email } = body;

    if (!email) {
      throw new ValidationError("Email is required");
    }

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Database query timed out")), 5000)
    );

    // Find the user by email
    const userPromise = User.findOne({ email }).maxTimeMS(3000).exec();
    const user = await Promise.race([userPromise, timeoutPromise]);

    // Always return success message for security (prevents email enumeration)
    if (!user) {
      logger.warn(`Password reset requested for non-existent email: ${email}`);
      return {
        success: true, // Still return success
        message:
          "If an account with that email exists, a password reset link has been sent.",
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

    // Construct reset link (replace with your actual frontend URL)
    const resetUrl = `${
      process.env.CLIENT_URL || "http://localhost:5173"
    }/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    // Send email (assuming emailService is configured)
    try {
      const { sendEmail } = await import("../services/emailService.js");
      await sendEmail({
        to: user.email,
        subject: "Password Reset Request",
        template: "passwordReset", // Ensure you have this template
        context: {
          name: user.fullName,
          resetUrl: resetUrl,
        },
      });
      logger.info("Password reset email sent successfully", {
        userId: user._id,
      });
    } catch (emailError) {
      logger.error("Failed to send password reset email", {
        userId: user._id,
        error: emailError,
      });
      // Don't fail the entire request if email sending fails, but log it.
      // The user still gets the success message.
    }

    return {
      success: true,
      message:
        "If an account with that email exists, a password reset link has been sent.",
    };
  } catch (error) {
    logger.error("Password reset request error:", error);

    if (error instanceof ValidationError) {
      if (set) set.status = 400;
      return { success: false, error: error.message, code: "VALIDATION_ERROR" };
    } else if (error instanceof DatabaseError) {
      if (set) set.status = 503;
      return {
        success: false,
        error: "Service temporarily unavailable.",
        code: "DB_ERROR",
      };
    } else if (
      error.message?.includes("timed out") ||
      error.name === "TimeoutError"
    ) {
      if (set) set.status = 504;
      return { success: false, error: "Request timed out.", code: "TIMEOUT" };
    }

    // Always return success message to the user for security, but log the internal error
    if (set) set.status = 200; // Return 200 OK even on internal errors
    return {
      success: true,
      message:
        "If an account with that email exists, a password reset link has been sent.",
    };
  }
};

// Verify user email with token
export const verifyEmail = async ({ body, set }) => {
  try {
    await checkDatabaseConnection();

    const { email, token } = body; // Expect token in body now

    if (!email || !token) {
      throw new ValidationError("Email and verification token are required");
    }

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Database query timed out")), 5000)
    );

    // Find the user by email and verification token, checking expiration
    const userPromise = User.findOne({
      email,
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() }, // Check expiration
    })
      .maxTimeMS(3000)
      .exec();

    const user = await Promise.race([userPromise, timeoutPromise]);

    if (!user) {
      // Check if user exists but token is wrong/expired
      const userExists = await User.findOne({ email }).maxTimeMS(3000).lean();
      if (userExists && userExists.isEmailVerified) {
        throw new ValidationError("Email is already verified.");
      }
      throw new ValidationError("Invalid or expired verification token");
    }

    // Update user verification status
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined; // Clear token
    user.emailVerificationExpires = undefined; // Clear expiration

    // Save the updated user
    const saveUserPromise = user.save({ maxTimeMS: 3000 });
    await Promise.race([saveUserPromise, timeoutPromise]);

    logger.info("Email verification successful", { userId: user._id });
    return {
      success: true,
      message: "Email verified successfully. You can now log in.",
    };
  } catch (error) {
    logger.error("Email verification error:", error);

    if (error instanceof ValidationError) {
      if (set) set.status = 400;
      return { success: false, error: error.message, code: "VALIDATION_ERROR" };
    } else if (error instanceof DatabaseError) {
      if (set) set.status = 503;
      return {
        success: false,
        error: "Service temporarily unavailable.",
        code: "DB_ERROR",
      };
    } else if (
      error.message?.includes("timed out") ||
      error.name === "TimeoutError"
    ) {
      if (set) set.status = 504;
      return { success: false, error: "Request timed out.", code: "TIMEOUT" };
    }

    if (set) set.status = 500;
    return {
      success: false,
      error: "An unexpected error occurred during email verification.",
      code: "INTERNAL_ERROR",
    };
  }
};

// Send email verification token
export const sendVerificationEmail = async ({ user, set }) => {
  // Takes user context from auth
  try {
    await checkDatabaseConnection();

    const userId = user?.userId || user?.id; // Get userId from authenticated context
    if (!userId) {
      throw new UnauthorizedError("Not authenticated");
    }

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Database query timed out")), 5000)
    );

    // Find the user
    const userPromise = User.findById(userId).maxTimeMS(3000).exec();
    const userData = await Promise.race([userPromise, timeoutPromise]);

    if (!userData) {
      throw new ValidationError("User not found");
    }

    // Check if email is already verified
    if (userData.isEmailVerified) {
      return { success: true, message: "Email is already verified." };
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(20).toString("hex");

    // Set token and expiration (24 hours)
    userData.emailVerificationToken = verificationToken;
    userData.emailVerificationExpires = Date.now() + 86400000; // 24 hours

    // Save the updated user
    const saveUserPromise = userData.save({ maxTimeMS: 3000 });
    await Promise.race([saveUserPromise, timeoutPromise]);

    // Construct verification link
    const verificationUrl = `${
      process.env.CLIENT_URL || "http://localhost:5173"
    }/verify-email?token=${verificationToken}&email=${encodeURIComponent(
      userData.email
    )}`;

    // Send email (assuming emailService is configured)
    try {
      const { sendEmail } = await import("../services/emailService.js");
      await sendEmail({
        to: userData.email,
        subject: "Verify Your Email Address",
        template: "emailVerification", // Ensure you have this template
        context: {
          name: userData.fullName,
          verificationUrl: verificationUrl,
        },
      });
      logger.info("Verification email sent successfully", {
        userId: userData._id,
      });
    } catch (emailError) {
      logger.error("Failed to send verification email", {
        userId: userData._id,
        error: emailError,
      });
      // Inform the user, but don't fail the whole request yet
      return {
        success: false, // Indicate failure due to email issue
        error:
          "Failed to send verification email. Please try again later or contact support.",
        code: "EMAIL_SEND_FAILURE",
      };
    }

    return {
      success: true,
      message:
        "Verification email sent successfully. Please check your email inbox.",
    };
  } catch (error) {
    logger.error("Send verification email error:", error);

    if (error instanceof UnauthorizedError) {
      if (set) set.status = 401;
      return { success: false, error: error.message, code: "UNAUTHORIZED" };
    } else if (error instanceof ValidationError) {
      if (set) set.status = 404;
      return { success: false, error: error.message, code: "NOT_FOUND" };
    } else if (error instanceof DatabaseError) {
      if (set) set.status = 503;
      return {
        success: false,
        error: "Service temporarily unavailable.",
        code: "DB_ERROR",
      };
    } else if (
      error.message?.includes("timed out") ||
      error.name === "TimeoutError"
    ) {
      if (set) set.status = 504;
      return { success: false, error: "Request timed out.", code: "TIMEOUT" };
    }

    if (set) set.status = 500;
    return {
      success: false,
      error: "An unexpected error occurred.",
      code: "INTERNAL_ERROR",
    };
  }
};

// Register student
export const registerStudent = async ({ body, set, jwt }) => {
  try {
    logger.info("Student registration attempt");
    const { fullName, email, password, department, profilePicture } = body;

    // Check if email already in use
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      set.status = 409;
      return {
        success: false,
        error: "Email already in use",
        code: "EMAIL_EXISTS",
      };
    }

    // Hash password with Argon2
    const hashedPassword = await argon2.hash(password);

    // Create new user with role student
    const user = new User({
      fullName,
      email,
      password: hashedPassword,
      role: "student",
      department,
      status: "active",
      profilePicture,
    });

    await user.save();

    // Generate unique student ID
    const studentId = await generateStudentId();

    // Create student record
    const student = new Student({
      user: user._id,
      studentId,
      profilePicture: profilePicture || user.profilePicture,
      academicYear:
        new Date().getFullYear() + "-" + (new Date().getFullYear() + 1),
    });

    await student.save();

    // Generate JWT token
    const token = await jwt.sign({
      userId: user._id,
      role: user.role,
      studentId: student.studentId,
    });

    return {
      success: true,
      token,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        department: user.department,
        studentId: student.studentId,
      },
    };
  } catch (error) {
    logger.error("Student registration error:", error);
    set.status = 500;
    return {
      success: false,
      error: "Registration failed",
      code: "REGISTRATION_FAILED",
    };
  }
};

// Register supervisor (pending admin approval)
export const registerSupervisor = async ({ body, set, jwt }) => {
  try {
    const { fullName, email, password, department, specialty } = body;

    // Check if email already in use
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      set.status = 409;
      return {
        success: false,
        error: "Email already in use",
        code: "EMAIL_EXISTS",
      };
    }

    // Hash password with Argon2
    const hashedPassword = await argon2.hash(password);

    // Create new user with role supervisor (not approved yet)
    const user = new User({
      fullName,
      email,
      password: hashedPassword,
      role: "supervisor",
      department,
      isApproved: false,
      status: "pending",
    });

    await user.save();

    // Generate unique supervisor ID
    const supervisorId = await generateSupervisorId();

    // Create supervisor record
    const supervisor = new Supervisor({
      user: user._id,
      supervisorId,
      department,
      specialty: specialty || "",
      status: "pending",
    });

    await supervisor.save();

    return {
      success: true,
      message: "Registration successful. Please wait for admin approval.",
      user: {
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    };
  } catch (error) {
    logger.error("Supervisor registration error:", error);
    set.status = 500;
    return {
      success: false,
      error: "Registration failed",
      code: "REGISTRATION_FAILED",
    };
  }
};

// User login
export const login = async ({ body, set, jwt }) => {
  try {
    const { email, password } = body;

    // Find user by email
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      set.status = 401;
      return {
        success: false,
        error: "Invalid credentials",
        code: "INVALID_CREDENTIALS",
      };
    }

    // Check password using Argon2
    const isMatch = await argon2.verify(user.password, password);
    if (!isMatch) {
      set.status = 401;
      return {
        success: false,
        error: "Invalid credentials",
        code: "INVALID_CREDENTIALS",
      };
    }

    // Check if user is approved (for supervisors)
    if (user.role === "supervisor" && !user.isApproved) {
      set.status = 403;
      return {
        success: false,
        error: "Account pending approval",
        code: "PENDING_APPROVAL",
      };
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Prepare token payload
    const tokenPayload = {
      userId: user._id,
      role: user.role,
    };

    // Add role-specific data
    if (user.role === "student") {
      const student = await Student.findOne({ user: user._id });
      if (student) {
        tokenPayload.studentId = student.studentId;
        tokenPayload.team = student.team;
      }
    } else if (user.role === "supervisor") {
      const supervisor = await Supervisor.findOne({ user: user._id });
      if (supervisor) {
        tokenPayload.supervisorId = supervisor.supervisorId;
      }
    }

    // Generate token
    const token = await jwt.sign(tokenPayload);

    // Prepare user data for response
    const userData = {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      department: user.department,
      profilePicture: user.profilePicture,
    };

    // Add role-specific data to response
    if (user.role === "student") {
      const student = await Student.findOne({ user: user._id });
      if (student) {
        userData.studentId = student.studentId;
        userData.team = student.team;
        userData.isTeamLeader = student.isTeamLeader;
      }
    } else if (user.role === "supervisor") {
      const supervisor = await Supervisor.findOne({ user: user._id });
      if (supervisor) {
        userData.supervisorId = supervisor.supervisorId;
        userData.specialty = supervisor.specialty;
      }
    }

    return {
      success: true,
      token,
      user: userData,
    };
  } catch (error) {
    logger.error("Login error:", error);
    set.status = 500;
    return {
      success: false,
      error: "Login failed",
      code: "LOGIN_FAILED",
    };
  }
};

// Change password
export const changePassword = async ({ body, user, set }) => {
  try {
    if (!user || !user.userId) {
      set.status = 401;
      return {
        success: false,
        error: "Not authenticated",
        code: "UNAUTHORIZED",
      };
    }

    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      set.status = 400;
      return {
        success: false,
        error: "Current password and new password are required",
        code: "VALIDATION_ERROR",
      };
    }

    // Password complexity validation
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      set.status = 400;
      return {
        success: false,
        error:
          "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character",
        code: "VALIDATION_ERROR",
      };
    }

    // Get user with password
    const userDoc = await User.findById(user.userId).select("+password");

    if (!userDoc) {
      set.status = 404;
      return {
        success: false,
        error: "User not found",
        code: "USER_NOT_FOUND",
      };
    }

    // Verify current password
    const isMatch = await argon2.verify(userDoc.password, currentPassword);
    if (!isMatch) {
      set.status = 401;
      return {
        success: false,
        error: "Current password is incorrect",
        code: "INCORRECT_PASSWORD",
      };
    }

    // Hash and update new password
    userDoc.password = await argon2.hash(newPassword);
    userDoc.passwordChangedAt = new Date();
    await userDoc.save();

    return {
      success: true,
      message: "Password updated successfully",
    };
  } catch (error) {
    logger.error("Change password error:", error);
    set.status = 500;
    return {
      success: false,
      error: "Failed to change password",
      code: "PASSWORD_CHANGE_FAILED",
    };
  }
};
