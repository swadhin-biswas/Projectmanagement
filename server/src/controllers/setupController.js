import { User } from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";
import logger from "../utils/logger.js";

/**
 * Setup a super admin account
 * This is a one-time setup operation that should be secured
 */
export const setupSuperAdmin = async ({ request, set, headers }) => {
  try {
    // Security check: Verify setup key from environment
    const setupKey = process.env.SUPER_ADMIN_SETUP_KEY;
    if (!setupKey || setupKey.length < 32) {
      logger.error(
        "Super admin setup failed: Missing or invalid setup key in environment"
      );
      set.status = 500;
      return {
        success: false,
        error: "Server misconfiguration: Setup key not properly configured",
      };
    }

    // Verify that the correct setup key is provided in headers
    const providedKey = headers["x-setup-key"];
    if (!providedKey || providedKey !== setupKey) {
      logger.warn("Unauthorized super admin setup attempt", {
        ip: request.headers["x-forwarded-for"] || "unknown",
      });
      set.status = 401;
      return {
        success: false,
        error: "Unauthorized: Invalid setup key",
      };
    }

    // Check if super admin already exists
    const existingSuperAdmin = await User.findOne({ role: "superadmin" });
    if (existingSuperAdmin) {
      logger.info("Super admin setup attempt when super admin already exists");
      set.status = 409;
      return {
        success: false,
        error: "A super admin account already exists",
      };
    }

    // Use provided credentials or default ones
    const {
      email = "swadhinbiswas.cse@gmail.com",
      password = "SwadhinBiswas32@@#Secure",
      fullName = "Super Administrator",
    } = request.body || {};

    // Validate inputs
    if (!email.includes("@") || password.length < 8) {
      set.status = 400;
      return {
        success: false,
        error:
          "Invalid email or password (password must be at least 8 characters)",
      };
    }

    // Create the super admin account
    const superAdmin = await User.create({
      email,
      password,
      fullName,
      role: "superadmin",
      isApproved: true,
      isEmailVerified: true,
      department: "Administration",
    });

    // Generate token for immediate login
    const token = generateToken(superAdmin._id);

    logger.info("🔑 Super admin account created successfully");

    set.status = 201;
    return {
      success: true,
      message: "Super admin account created successfully",
      token,
      user: {
        _id: superAdmin._id,
        email: superAdmin.email,
        fullName: superAdmin.fullName,
        role: superAdmin.role,
      },
    };
  } catch (error) {
    logger.error("Super admin setup error:", error);

    if (error.code === 11000) {
      // Duplicate key error (email already exists)
      set.status = 409;
      return {
        success: false,
        error: "Email already in use",
      };
    }

    set.status = 500;
    return {
      success: false,
      error: "Failed to create super admin account",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    };
  }
};
