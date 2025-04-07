import crypto from "crypto";
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

// Check database connection status
const checkDatabaseConnection = () => {
  if (global.dbConnectionIssue) {
    throw new DatabaseError(
      "Database connection issue. Please try again later."
    );
  }
};

// Register user with improved error handling and timeout management
export const registerUser = async ({ body, set = {} }) => {
  try {
    // Check database connection first
    checkDatabaseConnection();

    // Set a shorter timeout for Mongoose operations
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Database operation timed out")), 5000)
    );

    // Validate all fields
    validateRegistration(body);

    const { fullName, email, password, role, department, studentId, supervisorId, specialization } = body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ConflictError("User already exists with this email");
    }

    // Create user
    const user = await User.create({
      fullName,
      email,
      password,
      role,
      department,
      isApproved: role === "supervisor" ? false : true,
    });

    // Generate IDs and create role-specific profiles
    let generatedStudentId, generatedSupervisorId;

    if (role === "student") {
      generatedStudentId = studentId || await generateStudentId();
      const createStudentPromise = Student.create({
        user: user._id,
        studentId: generatedStudentId,
        department
      });
      await Promise.race([createStudentPromise, timeoutPromise]);
    } else if (role === "supervisor") {
      generatedSupervisorId = supervisorId || await generateSupervisorId();
      const createSupervisorPromise = Supervisor.create({
        user: user._id,
        supervisorId: generatedSupervisorId,
        department,
        specialization: specialization || []
      });
      await Promise.race([createSupervisorPromise, timeoutPromise]);
    }

    // Generate token
    const token = generateToken(user._id);

    // Only set status if set object exists
    if (set) {
      set.status = 201;
    }

    // Return response in the client-expected format
    return {
      success: true,
      token,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        department: user.department,
        isApproved: user.isApproved,
        studentId: role === "student" ? generatedStudentId : undefined,
        supervisorId: role === "supervisor" ? generatedSupervisorId : undefined,
        profilePicture: user.profilePicture
      }
    };
  } catch (error) {
    logger.error("Registration error:", error);

    // Handle specific error types
    if (error instanceof ConflictError) {
      if (set) set.status = 409;
      return {
        success: false,
        error: error.message,
        code: "USER_EXISTS"
      };
    } else if (error instanceof ValidationError) {
      if (set) set.status = 400;
      return {
        success: false,
        error: error.message,
        code: "VALIDATION_ERROR"
      };
    } else if (error instanceof DatabaseError) {
      if (set) set.status = 503;
      return {
        success: false,
        error: "Service temporarily unavailable. Please try again later.",
        code: "DB_ERROR"
      };
    } else if (error.message.includes("timed out")) {
      if (set) set.status = 504;
      return {
        success: false,
        error: "Request timed out. Please try again later.",
        code: "TIMEOUT_ERROR"
      };
    }

    // Generic error handler
    if (set) set.status = 500;
    return {
      success: false,
      error: "An unexpected error occurred during registration. Please try again.",
      code: "INTERNAL_ERROR"
    };
  }
};

// Login user with improved error handling and timeout management
export const loginUser = async ({ body, set }) => {
  try {
    // Check database connection first
    checkDatabaseConnection();

    // Set a shorter timeout for Mongoose operations
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Database operation timed out")), 5000)
    );

    validateLogin(body);
    const { email, password } = body;

    // Find user and include password for verification with timeout safety
    const userPromise = User.findOne({ email })
      .select("+password")
      .maxTimeMS(3000)
      .exec();
    const user = await Promise.race([userPromise, timeoutPromise]);

    if (!user) {
      if (set) set.status = 401;
      return {
        success: false,
        error: "Invalid email or password",
      };
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      if (set) set.status = 401;
      return {
        success: false,
        error: "Invalid email or password",
      };
    }

    // Check supervisor approval
    if (user.role === "supervisor" && !user.isApproved) {
      if (set) set.status = 403;
      return {
        success: false,
        error:
          "Your account is pending approval. Please wait for admin approval.",
      };
    }

    // Generate token with userId
    const token = generateToken(user._id);

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    return {
      success: true,
      data: {
        user: userResponse,
        token,
      },
    };
  } catch (error) {
    logger.error("Login error:", error);

    // Handle specific error types
    if (error instanceof ValidationError) {
      if (set) set.status = 400;
      return {
        success: false,
        error: error.message,
        code: "VALIDATION_ERROR",
      };
    } else if (error instanceof DatabaseError) {
      if (set) set.status = 503;
      return {
        success: false,
        error: "Service temporarily unavailable. Please try again later.",
        code: "DB_ERROR",
      };
    } else if (error.message.includes("timed out")) {
      if (set) set.status = 504;
      return {
        success: false,
        error: "Request timed out. Please try again later.",
        code: "TIMEOUT_ERROR",
      };
    }

    // Generic error handler
    if (set) set.status = 500;
    return {
      success: false,
      error: "An unexpected error occurred during login. Please try again.",
      code: "INTERNAL_ERROR",
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
      if (set) set.status = 401;
      return {
        success: false,
        error: error.message,
        code: "UNAUTHORIZED",
      };
    } else if (error instanceof ValidationError) {
      if (set) set.status = 404;
      return {
        success: false,
        error: error.message,
        code: "NOT_FOUND",
      };
    } else if (error instanceof DatabaseError) {
      if (set) set.status = 503;
      return {
        success: false,
        error: "Service temporarily unavailable. Please try again later.",
        code: "DB_ERROR",
      };
    } else if (error.message.includes("timed out")) {
      if (set) set.status = 504;
      return {
        success: false,
        error: "Request timed out. Please try again later.",
        code: "TIMEOUT_ERROR",
      };
    }

    // Generic error handler
    if (set) set.status = 500;
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
      if (set) set.status = 401;
      return {
        success: false,
        error: error.message,
        code: "UNAUTHORIZED",
      };
    } else if (error instanceof ValidationError) {
      if (set) set.status = 400;
      return {
        success: false,
        error: error.message,
        code: "VALIDATION_ERROR",
      };
    } else if (error instanceof ConflictError) {
      if (set) set.status = 409;
      return {
        success: false,
        error: error.message,
        code: "CONFLICT_ERROR",
      };
    } else if (error instanceof DatabaseError) {
      if (set) set.status = 503;
      return {
        success: false,
        error: "Service temporarily unavailable. Please try again later.",
        code: "DB_ERROR",
      };
    } else if (error.message.includes("timed out")) {
      if (set) set.status = 504;
      return {
        success: false,
        error: "Request timed out. Please try again later.",
        code: "TIMEOUT_ERROR",
      };
    }

    // Generic error handler
    if (set) set.status = 500;
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
      if (set) set.status = 400;
      return {
        success: false,
        error: error.message,
        code: "VALIDATION_ERROR",
      };
    } else if (error instanceof DatabaseError) {
      if (set) set.status = 503;
      return {
        success: false,
        error: "Service temporarily unavailable. Please try again later.",
        code: "DB_ERROR",
      };
    } else if (error.message.includes("timed out")) {
      if (set) set.status = 504;
      return {
        success: false,
        error: "Request timed out. Please try again later.",
        code: "TIMEOUT_ERROR",
      };
    }

    // Generic error handler
    if (set) set.status = 500;
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
      if (set) set.status = 400;
      return {
        success: false,
        error: error.message,
        code: "VALIDATION_ERROR",
      };
    } else if (error instanceof DatabaseError) {
      if (set) set.status = 503;
      return {
        success: false,
        error: "Service temporarily unavailable. Please try again later.",
        code: "DB_ERROR",
      };
    } else if (error.message.includes("timed out")) {
      if (set) set.status = 504;
      return {
        success: false,
        error: "Request timed out. Please try again later.",
        code: "TIMEOUT_ERROR",
      };
    }

    // Generic error handler
    if (set) set.status = 500;
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
      if (set) set.status = 400;
      return {
        success: false,
        error: error.message,
        code: "VALIDATION_ERROR",
      };
    } else if (error instanceof DatabaseError) {
      if (set) set.status = 503;
      return {
        success: false,
        error: "Service temporarily unavailable. Please try again later.",
        code: "DB_ERROR",
      };
    } else if (error.message.includes("timed out")) {
      if (set) set.status = 504;
      return {
        success: false,
        error: "Request timed out. Please try again later.",
        code: "TIMEOUT_ERROR",
      };
    }

    // Generic error handler
    if (set) set.status = 500;
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
      if (set) set.status = 400;
      return {
        success: false,
        error: error.message,
        code: "VALIDATION_ERROR",
      };
    } else if (error instanceof DatabaseError) {
      if (set) set.status = 503;
      return {
        success: false,
        error: "Service temporarily unavailable. Please try again later.",
        code: "DB_ERROR",
      };
    } else if (error.message.includes("timed out")) {
      if (set) set.status = 504;
      return {
        success: false,
        error: "Request timed out. Please try again later.",
        code: "TIMEOUT_ERROR",
      };
    }

    // Generic error handler
    if (set) set.status = 500;
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
      if (set) set.status = 401;
      return {
        success: false,
        error: error.message,
        code: "UNAUTHORIZED",
      };
    } else if (error instanceof ValidationError) {
      if (set) set.status = 404;
      return {
        success: false,
        error: error.message,
        code: "NOT_FOUND",
      };
    } else if (error instanceof DatabaseError) {
      if (set) set.status = 503;
      return {
        success: false,
        error: "Service temporarily unavailable. Please try again later.",
        code: "DB_ERROR",
      };
    } else if (error.message.includes("timed out")) {
      if (set) set.status = 504;
      return {
        success: false,
        error: "Request timed out. Please try again later.",
        code: "TIMEOUT_ERROR",
      };
    }

    // Generic error handler
    if (set) set.status = 500;
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
      code: "INTERNAL_ERROR",
    };
  }
};

// Helper functions with timeout handling
async function generateStudentId() {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Operation timed out")), 3000)
  );

  const lastStudentPromise = Student.findOne()
    .sort("-studentId")
    .maxTimeMS(2000)
    .exec();
  const lastStudent = await Promise.race([lastStudentPromise, timeoutPromise]);

  const newId = lastStudent
    ? String(Number(lastStudent.studentId.replace("STU", "")) + 1).padStart(
        6,
        "0"
      )
    : "000001";
  return `STU${newId}`;
}

async function generateSupervisorId() {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Operation timed out")), 3000)
  );

  const lastSupervisorPromise = Supervisor.findOne()
    .sort("-supervisorId")
    .maxTimeMS(2000)
    .exec();
  const lastSupervisor = await Promise.race([
    lastSupervisorPromise,
    timeoutPromise,
  ]);

  const newId = lastSupervisor
    ? String(
        Number(lastSupervisor.supervisorId.replace("SUP", "")) + 1
      ).padStart(6, "0")
    : "000001";
  return `SUP${newId}`;
}
