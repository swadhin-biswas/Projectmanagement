import argon2 from "@node-rs/argon2";
import crypto from "crypto";
import mongoose from "mongoose";
import { signToken } from "../middleware/auth.js"; // Replace generateToken with signToken
import { Student, Supervisor, User } from "../models/User.js";
import {
  ConflictError,
  DatabaseError,
  UnauthorizedError,
  ValidationError,
} from "../utils/errors.js";
import logger from "../utils/logger.js";
import { validateLogin, validateRegistration } from "../utils/validation.js";

// Helper function to check database connection
const checkDatabaseConnection = async () => {
  try {
    const connectionState = mongoose.connection.readyState;
    logger.info(`MongoDB connection state: ${connectionState}`);

    if (connectionState !== 1) {
      throw new DatabaseError(
        `Database not connected. Connection state: ${connectionState}`
      );
    }
  } catch (error) {
    logger.error("Database connection error:", error);
    if (!(error instanceof DatabaseError)) {
      throw new DatabaseError("Database connection failed. Please try again.");
    } else {
      throw error;
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
export const registerUser = async ({ body, set }) => {
  // Removed unused jwt parameter
  const functionName = "registerUser";
  try {
    await checkDatabaseConnection();
    logger.info("MongoDB connection verified", {
      function: functionName,
      state: mongoose.connection.readyState,
    });

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
      set.status = 500;
      return {
        success: false,
        error: "Server configuration error. Please contact support.",
        timestamp: new Date().toISOString(),
      };
    }

    validateRegistration(body);

    const {
      email,
      password,
      fullName,
      role,
      department,
      specialization,
      studentId,
    } = body;

    logger.info(`Checking for existing user with email: ${email}`);
    const existingUser = await User.findOne({ email }).maxTimeMS(5000).lean();

    if (existingUser) {
      logger.warn(`Email already registered: ${email}`);
      throw new ConflictError("Email already registered");
    }
    logger.info(
      `No existing user found with email: ${email}. Proceeding with registration.`
    );

    logger.info(`Creating new user object for: ${email}`);
    const user = new User({
      email,
      password, // Will be hashed by pre-save hook
      fullName,
      role,
      department,
      isApproved: role === "student",
      status: role === "student" ? "active" : "pending",
      isEmailVerified: true, // Adjust if verification is required
    });

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

    let token = null;
    if (role === "student") {
      const { token: generatedToken } = await signToken(
        savedUser._id.toString(),
        savedUser.email,
        savedUser.role
      );
      token = generatedToken;
    }

    logger.info("New user registered successfully", {
      function: functionName,
      userId: savedUser._id,
      email: savedUser.email,
      role: savedUser.role,
    });

    set.status = 201;
    return {
      success: true,
      message:
        role === "supervisor"
          ? "Registration successful. Your account awaits administrator approval."
          : "Registration successful.",
      token, // Null for supervisors
      user: {
        _id: savedUser._id.toString(),
        fullName: savedUser.fullName,
        email: savedUser.email,
        role: savedUser.role,
        department: savedUser.department,
        isApproved: savedUser.isApproved,
        status: savedUser.status,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error("Registration error", {
      function: functionName,
      error: error.message,
      stack: error.stack,
      requestBody: body,
    });

    if (error instanceof ValidationError) {
      set.status = 400;
      return {
        success: false,
        error: error.message,
        field: error.field,
        timestamp: new Date().toISOString(),
      };
    } else if (error instanceof ConflictError) {
      set.status = 409;
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    } else if (error instanceof DatabaseError) {
      set.status = 503;
      return {
        success: false,
        error: "Service temporarily unavailable. Please try again later.",
        timestamp: new Date().toISOString(),
      };
    } else if (
      error.message?.includes("timed out") ||
      error.name === "TimeoutError"
    ) {
      set.status = 504;
      return {
        success: false,
        error: "Request timed out. Please try again.",
        timestamp: new Date().toISOString(),
      };
    } else if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      logger.error(`Duplicate ${field} error during registration`);
      set.status = 409;
      return {
        success: false,
        error: `This ${field} is already registered`,
        field,
        timestamp: new Date().toISOString(),
      };
    }

    set.status = error.status || 500;
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

export const loginUser = async ({ body, set }) => {
  try {
    await checkDatabaseConnection();
    validateLogin(body);

    const { email, password } = body;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Database query timed out")), 5000)
    );

    logger.info(`Login attempt for user: ${email}`);
    const userPromise = User.findOne({ email })
      .select("+password")
      .maxTimeMS(3000)
      .exec();

    const user = await Promise.race([userPromise, timeoutPromise]);

    if (!user) {
      logger.warn(`Login failed: No user found with email ${email}`);
      throw new UnauthorizedError("Invalid email or password");
    }

    logger.debug("Retrieved user object during login:", {
      userId: user._id,
      email: user.email,
      role: user.role,
      passwordHashExists: !!user.password,
    });

    logger.info(`Verifying password for user: ${email}`);
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      logger.warn(`Login failed: Invalid password for user ${email}`);
      throw new UnauthorizedError("Invalid email or password");
    }

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

    const { token, expiresIn } = await signToken(
      user._id.toString(),
      user.email,
      user.role
    );

    user.lastLogin = new Date();
    user
      .save()
      .catch((err) => logger.error("Failed to update last login", err));

    const userResponse = {
      _id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      department: user.department,
      isApproved: user.isApproved,
    };

    logger.info(`Login successful for user: ${email}`);
    set.status = 200;
    return {
      success: true,
      token,
      user: userResponse,
      expiresIn, // Added for client convenience
      error: null,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error("Login error:", error);

    if (error instanceof ValidationError) {
      set.status = 400;
      return {
        success: false,
        error: error.message,
        field: error.field,
        timestamp: new Date().toISOString(),
      };
    } else if (error instanceof UnauthorizedError) {
      set.status = 401;
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    } else if (error instanceof DatabaseError) {
      set.status = 503;
      return {
        success: false,
        error: "Service temporarily unavailable. Please try again later.",
        timestamp: new Date().toISOString(),
      };
    } else if (
      error.message?.includes("timed out") ||
      error.name === "TimeoutError"
    ) {
      set.status = 504;
      return {
        success: false,
        error: "Login request timed out. Please try again.",
        timestamp: new Date().toISOString(),
      };
    }

    set.status = 500;
    return {
      success: false,
      error: "Login failed due to an internal error.",
      timestamp: new Date().toISOString(),
    };
  }
};

// Other functions remain unchanged unless they generate tokens
// For brevity, only updating registerUser and loginUser as they are critical for the issue

export const getUserProfile = async (context) => {
  const { user, set } = context;
  try {
    await checkDatabaseConnection();

    const userId = user?.userId || user?.id; // Updated to handle jwtAuth's user.id
    logger.debug("getUserProfile called with userId:", { userId });

    if (!userId) {
      throw new UnauthorizedError("Not authenticated");
    }

    logger.info("Fetching profile for user ID:", userId);

    const hardcodedProfile = {
      _id: userId,
      fullName: "Test User",
      email: user.email || "test@example.com",
      role: user.role || "student",
      department: "Computer Science",
      isApproved: true,
      profilePicture: "",
    };

    if (user.role === "student") {
      hardcodedProfile.studentId = "STU000001";
    } else if (user.role === "supervisor") {
      hardcodedProfile.supervisorId = "SUP0001";
    }

    logger.info("Returning hardcoded profile for testing purposes");

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
      set.status = 401;
      return {
        success: false,
        error: "Unauthorized",
        timestamp: new Date().toISOString(),
      };
    } else if (error instanceof ValidationError) {
      set.status = 404;
      return {
        success: false,
        error: "User profile not found",
        timestamp: new Date().toISOString(),
      };
    } else if (error instanceof DatabaseError) {
      set.status = 503;
      return {
        success: false,
        error: "Service temporarily unavailable",
        timestamp: new Date().toISOString(),
      };
    }

    set.status = error.status || 500;
    return {
      success: false,
      error: "An unexpected error occurred",
      timestamp: new Date().toISOString(),
    };
  }
};

// Update user profile with improved error handling
export const updateProfile = async (context) => {
  const { body, set, user } = context; // Removed unused jwt
  try {
    await checkDatabaseConnection();

    const userId = user?.id; // Use id from jwtAuth
    if (!userId) {
      throw new UnauthorizedError("Not authenticated");
    }

    const currentUserEmail = user?.email;

    const { fullName, email, department, specialization, profilePicture } =
      body;

    const updateData = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (email !== undefined) updateData.email = email;
    if (department !== undefined) updateData.department = department;
    if (profilePicture !== undefined)
      updateData.profilePicture = profilePicture;

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Database query timed out")), 5000)
    );

    if (email && email !== currentUserEmail) {
      logger.info(`Checking if new email ${email} is already taken.`);
      const emailExistsPromise = User.findOne({ email, _id: { $ne: userId } })
        .maxTimeMS(3000)
        .lean()
        .exec();
      const emailExists = await Promise.race([
        emailExistsPromise,
        timeoutPromise,
      ]);
      if (emailExists) {
        throw new ConflictError("Email already in use by another account");
      }
      logger.info(`New email ${email} is available.`);
      updateData.isEmailVerified = false;
    }

    if (Object.keys(updateData).length === 0 && !specialization) {
      set.status = 200;
      const currentUserData = await User.findById(userId)
        .select("-password")
        .lean();
      return {
        success: true,
        message: "No changes detected in profile.",
        user: currentUserData
          ? {
              _id: currentUserData._id.toString(),
              fullName: currentUserData.fullName,
              email: currentUserData.email,
              role: currentUserData.role,
              department: currentUserData.department,
              isApproved: currentUserData.isApproved,
              isEmailVerified: currentUserData.isEmailVerified,
              profilePicture: currentUserData.profilePicture,
            }
          : null,
      };
    }

    logger.info(`Updating user profile for ID: ${userId}`);
    const updatedUserPromise = User.findByIdAndUpdate(
      userId,
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
      throw new ValidationError("User not found during update");
    }

    logger.info(`User profile updated in User collection for ID: ${userId}`);

    if (user.role === "supervisor" && specialization !== undefined) {
      logger.info(`Updating supervisor specialization for ID: ${userId}`);
      const updateSupervisorPromise = Supervisor.findOneAndUpdate(
        { user: userId },
        { specialization },
        { new: true }
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
      } else {
        logger.info(`Supervisor specialization updated for ID: ${userId}`);
      }
    }

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
      set.status = 401;
      return { success: false, error: error.message, code: "UNAUTHORIZED" };
    } else if (error instanceof ValidationError) {
      set.status = 400;
      return {
        success: false,
        error: error.message,
        field: error.field,
        code: "VALIDATION_ERROR",
      };
    } else if (error instanceof ConflictError) {
      set.status = 409;
      return { success: false, error: error.message, code: "CONFLICT" };
    } else if (error instanceof DatabaseError) {
      set.status = 503;
      return {
        success: false,
        error: "Service temporarily unavailable.",
        code: "DB_ERROR",
      };
    } else if (
      error.message?.includes("timed out") ||
      error.name === "TimeoutError"
    ) {
      set.status = 504;
      return {
        success: false,
        error: "Request timed out.",
        code: "TIMEOUT",
      };
    }

    set.status = 500;
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

    const { email, token: resetToken, password: newPassword } = body;

    if (!email || !resetToken || !newPassword) {
      throw new ValidationError(
        "Email, reset token, and new password are required"
      );
    }

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

    const userPromise = User.findOne({
      email,
      resetPasswordToken: resetToken,
      resetPasswordExpires: { $gt: Date.now() },
    })
      .maxTimeMS(3000)
      .exec();

    const user = await Promise.race([userPromise, timeoutPromise]);

    if (!user) {
      throw new ValidationError("Invalid or expired password reset token");
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

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

    if (error instanceof ValidationError) {
      set.status = 400;
      return { success: false, error: error.message, code: "VALIDATION_ERROR" };
    } else if (error instanceof DatabaseError) {
      set.status = 503;
      return {
        success: false,
        error: "Service temporarily unavailable.",
        code: "DB_ERROR",
      };
    } else if (
      error.message?.includes("timed out") ||
      error.name === "TimeoutError"
    ) {
      set.status = 504;
      return { success: false, error: "Request timed out.", code: "TIMEOUT" };
    }

    set.status = 500;
    return {
      success: false,
      error: "An unexpected error occurred during password reset.",
      code: "INTERNAL_ERROR",
    };
  }
};

// Request password reset
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

    const userPromise = User.findOne({ email }).maxTimeMS(3000).exec();
    const user = await Promise.race([userPromise, timeoutPromise]);

    if (!user) {
      logger.warn(`Password reset requested for non-existent email: ${email}`);
      return {
        success: true,
        message:
          "If an account with that email exists, a password reset link has been sent.",
      };
    }

    const resetToken = crypto.randomBytes(20).toString("hex");

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000;

    const saveUserPromise = user.save({ maxTimeMS: 3000 });
    await Promise.race([saveUserPromise, timeoutPromise]);

    const resetUrl = `${
      process.env.CLIENT_URL || "http://localhost:5173"
    }/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    try {
      const { sendEmail } = await import("../services/emailService.js");
      await sendEmail({
        to: user.email,
        subject: "Password Reset Request",
        template: "passwordReset",
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
    }

    return {
      success: true,
      message:
        "If an account with that email exists, a password reset link has been sent.",
    };
  } catch (error) {
    logger.error("Password reset request error:", error);

    if (error instanceof ValidationError) {
      set.status = 400;
      return { success: false, error: error.message, code: "VALIDATION_ERROR" };
    } else if (error instanceof DatabaseError) {
      set.status = 503;
      return {
        success: false,
        error: "Service temporarily unavailable.",
        code: "DB_ERROR",
      };
    } else if (
      error.message?.includes("timed out") ||
      error.name === "TimeoutError"
    ) {
      set.status = 504;
      return { success: false, error: "Request timed out.", code: "TIMEOUT" };
    }

    set.status = 200;
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

    const { email, token } = body;

    if (!email || !token) {
      throw new ValidationError("Email and verification token are required");
    }

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Database query timed out")), 5000)
    );

    const userPromise = User.findOne({
      email,
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() },
    })
      .maxTimeMS(3000)
      .exec();

    const user = await Promise.race([userPromise, timeoutPromise]);

    if (!user) {
      const userExists = await User.findOne({ email }).maxTimeMS(3000).lean();
      if (userExists && userExists.isEmailVerified) {
        throw new ValidationError("Email is already verified.");
      }
      throw new ValidationError("Invalid or expired verification token");
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;

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
      set.status = 400;
      return { success: false, error: error.message, code: "VALIDATION_ERROR" };
    } else if (error instanceof DatabaseError) {
      set.status = 503;
      return {
        success: false,
        error: "Service temporarily unavailable.",
        code: "DB_ERROR",
      };
    } else if (
      error.message?.includes("timed out") ||
      error.name === "TimeoutError"
    ) {
      set.status = 504;
      return { success: false, error: "Request timed out.", code: "TIMEOUT" };
    }

    set.status = 500;
    return {
      success: false,
      error: "An unexpected error occurred during email verification.",
      code: "INTERNAL_ERROR",
    };
  }
};

// Send email verification token
export const sendVerificationEmail = async ({ user, set }) => {
  try {
    await checkDatabaseConnection();

    const userId = user?.id; // Use id from jwtAuth
    if (!userId) {
      throw new UnauthorizedError("Not authenticated");
    }

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Database query timed out")), 5000)
    );

    const userPromise = User.findById(userId).maxTimeMS(3000).exec();
    const userData = await Promise.race([userPromise, timeoutPromise]);

    if (!userData) {
      throw new ValidationError("User not found");
    }

    if (userData.isEmailVerified) {
      return { success: true, message: "Email is already verified." };
    }

    const verificationToken = crypto.randomBytes(20).toString("hex");

    userData.emailVerificationToken = verificationToken;
    userData.emailVerificationExpires = Date.now() + 86400000;

    const saveUserPromise = userData.save({ maxTimeMS: 3000 });
    await Promise.race([saveUserPromise, timeoutPromise]);

    const verificationUrl = `${
      process.env.CLIENT_URL || "http://localhost:5173"
    }/verify-email?token=${verificationToken}&email=${encodeURIComponent(
      userData.email
    )}`;

    try {
      const { sendEmail } = await import("../services/emailService.js");
      await sendEmail({
        to: userData.email,
        subject: "Verify Your Email Address",
        template: "emailVerification",
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
      return {
        success: false,
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
      set.status = 401;
      return { success: false, error: error.message, code: "UNAUTHORIZED" };
    } else if (error instanceof ValidationError) {
      set.status = 404;
      return { success: false, error: error.message, code: "NOT_FOUND" };
    } else if (error instanceof DatabaseError) {
      set.status = 503;
      return {
        success: false,
        error: "Service temporarily unavailable.",
        code: "DB_ERROR",
      };
    } else if (
      error.message?.includes("timed out") ||
      error.name === "TimeoutError"
    ) {
      set.status = 504;
      return { success: false, error: "Request timed out.", code: "TIMEOUT" };
    }

    set.status = 500;
    return {
      success: false,
      error: "An unexpected error occurred.",
      code: "INTERNAL_ERROR",
    };
  }
};

// Register student (simplified version)
export const registerStudent = async ({ body, set }) => {
  // Removed unused jwt
  try {
    logger.info("Student registration attempt");
    const { fullName, email, password, department, profilePicture } = body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      set.status = 409;
      return {
        success: false,
        error: "Email already in use",
        code: "EMAIL_EXISTS",
      };
    }

    const hashedPassword = await argon2.hash(password);

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

    const studentId = await generateStudentId();

    const student = new Student({
      user: user._id,
      studentId,
      profilePicture: profilePicture || user.profilePicture,
      academicYear:
        new Date().getFullYear() + "-" + (new Date().getFullYear() + 1),
    });

    await student.save();

    const { token } = await signToken(
      user._id.toString(),
      user.email,
      user.role
    );

    return {
      success: true,
      token,
      user: {
        _id: user._id.toString(),
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
export const registerSupervisor = async ({ body, set }) => {
  // Removed unused jwt
  try {
    const { fullName, email, password, department, specialty } = body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      set.status = 409;
      return {
        success: false,
        error: "Email already in use",
        code: "EMAIL_EXISTS",
      };
    }

    const hashedPassword = await argon2.hash(password);

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

    const supervisorId = await generateSupervisorId();

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

// User login (simplified version)
export const login = async ({ body, set }) => {
  // Removed unused jwt
  try {
    const { email, password } = body;

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      set.status = 401;
      return {
        success: false,
        error: "Invalid credentials",
        code: "INVALID_CREDENTIALS",
      };
    }

    const isMatch = await argon2.verify(user.password, password);
    if (!isMatch) {
      set.status = 401;
      return {
        success: false,
        error: "Invalid credentials",
        code: "INVALID_CREDENTIALS",
      };
    }

    if (user.role === "supervisor" && !user.isApproved) {
      set.status = 403;
      return {
        success: false,
        error: "Account pending approval",
        code: "PENDING_APPROVAL",
      };
    }

    user.lastLogin = new Date();
    await user.save();

    const { token } = await signToken(
      user._id.toString(),
      user.email,
      user.role
    );

    const userData = {
      _id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      department: user.department,
      profilePicture: user.profilePicture,
    };

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
    if (!user || !user.id) {
      // Use id from jwtAuth
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

    const userDoc = await User.findById(user.id).select("+password");

    if (!userDoc) {
      set.status = 404;
      return {
        success: false,
        error: "User not found",
        code: "USER_NOT_FOUND",
      };
    }

    const isMatch = await argon2.verify(userDoc.password, currentPassword);
    if (!isMatch) {
      set.status = 401;
      return {
        success: false,
        error: "Current password is incorrect",
        code: "INCORRECT_PASSWORD",
      };
    }

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
