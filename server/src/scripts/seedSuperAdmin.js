import argon2 from "@node-rs/argon2"; // Use the same argon2 package as controller
import { config } from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import { User } from "../models/User.js"; // Adjust path as necessary

// --- Configuration ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load .env variables from the server root directory
config({ path: path.resolve(__dirname, "../../.env") });

const {
  MONGO_URI,
  DEFAULT_ADMIN_EMAIL,
  DEFAULT_ADMIN_PASSWORD,
  DEFAULT_ADMIN_FULLNAME = "Super Administrator", // Add a default name
  DEFAULT_ADMIN_DEPARTMENT = "System", // Add a default department
} = process.env;

// --- Helper Functions ---
const log = (message, type = "info") => {
  const prefix =
    type === "error" ? "❌ Error:" : type === "warn" ? "⚠️ Warn:" : "✅ Info:";
  console.log(`${prefix} ${message}`);
};

// --- Main Seed Function ---
const seedSuperAdmin = async () => {
  log("Starting superadmin seed script...");

  // Validate environment variables
  if (!MONGO_URI) {
    log("MONGO_URI not found in .env file. Exiting.", "error");
    process.exit(1);
  }
  if (!DEFAULT_ADMIN_EMAIL || !DEFAULT_ADMIN_PASSWORD) {
    log(
      "DEFAULT_ADMIN_EMAIL or DEFAULT_ADMIN_PASSWORD not found in .env file. Exiting.",
      "error"
    );
    process.exit(1);
  }

  let connection;
  try {
    // Connect to database
    log(
      `Connecting to MongoDB at ${MONGO_URI.substring(
        0,
        MONGO_URI.indexOf("@") > 0 ? MONGO_URI.indexOf("@") : 30
      )}...`
    );
    connection = await mongoose.connect(MONGO_URI);
    log("Database connection successful.");

    // Check if superadmin already exists
    log("Checking for existing superadmin account...");
    const existingSuperAdmin = await User.findOne({
      role: "superadmin",
    }).lean();

    if (existingSuperAdmin) {
      log(`Superadmin already exists: ${existingSuperAdmin.email}`, "warn");
      return; // Exit gracefully if superadmin exists
    }

    // Create superadmin if none exists
    log("No existing superadmin found. Creating new account...");
    log(`Using email: ${DEFAULT_ADMIN_EMAIL}`);

    // Hash password
    log("Hashing password...");
    const hashedPassword = await argon2.hash(DEFAULT_ADMIN_PASSWORD);
    log("Password hashed successfully.");

    // Create user document
    const superAdmin = new User({
      fullName: DEFAULT_ADMIN_FULLNAME,
      email: DEFAULT_ADMIN_EMAIL,
      password: hashedPassword,
      role: "superadmin",
      department: DEFAULT_ADMIN_DEPARTMENT,
      isApproved: true, // Superadmin is always approved
      status: "active", // Superadmin is always active
      isEmailVerified: true, // Assume verified for simplicity in seeding
    });

    // Save user
    log("Saving superadmin account to database...");
    await superAdmin.save();
    log(`Superadmin account created successfully with ID: ${superAdmin._id}`);
  } catch (error) {
    log(`Seed script failed: ${error.message}`, "error");
    if (error.stack) {
      console.error(error.stack);
    }
    process.exitCode = 1; // Indicate failure
  } finally {
    // Disconnect from database
    if (connection) {
      log("Disconnecting from database...");
      await mongoose.disconnect();
      log("Database disconnected.");
    }
  }
};

// --- Run the script ---
seedSuperAdmin();
