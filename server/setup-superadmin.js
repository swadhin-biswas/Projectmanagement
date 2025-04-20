import argon2 from "@node-rs/argon2";
import { config } from "dotenv";
import mongoose from "mongoose";
import path from "path";
import readline from "readline";
import { fileURLToPath } from "url";

// --- Configuration ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load .env variables from the server root directory
config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// --- Helper Functions ---
const log = (message, type = "info") => {
  const prefix =
    type === "error" ? "❌ Error:" : type === "warn" ? "⚠️ Warn:" : "✅ Info:";
  console.log(`${prefix} ${message}`);
};

const promptInput = async (question, defaultValue = "") => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer || defaultValue);
    });
  });
};

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  return password.length >= 8; // Basic validation; align with your app's requirements
};

// --- Main Setup Function ---
const setupSuperAdmin = async () => {
  log("Starting superadmin setup script...");

  // Get database connection string
  let MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) {
    MONGO_URI = await promptInput(
      "Enter MongoDB connection string (default: mongodb://localhost:27017/projectmanagement): ",
      "mongodb://localhost:27017/projectmanagement"
    );
  }

  // Get admin credentials
  let email = await promptInput("Enter superadmin email: ");
  if (!email || !validateEmail(email)) {
    log("Valid superadmin email is required. Exiting.", "error");
    process.exit(1);
  }

  let password = await promptInput("Enter superadmin password: ");
  if (!password || !validatePassword(password)) {
    log("Password must be at least 8 characters long. Exiting.", "error");
    process.exit(1);
  }

  const fullName = await promptInput(
    "Enter superadmin name (default: Super Administrator): ",
    "Super Administrator"
  );
  const department = await promptInput(
    "Enter superadmin department (default: System): ",
    "System"
  );

  let connection;
  try {
    // Dynamically import the User model
    const { User } = await import(
      "/home/swadhin/projects/Projectmanagement/server/src/models/User.js"
    ); // Adjust path if needed

    // Connect to database
    log(
      `Connecting to MongoDB at ${MONGO_URI.substring(
        0,
        MONGO_URI.indexOf("@") > 0 ? MONGO_URI.indexOf("@") : 30
      )}...`
    );
    connection = await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    log("Database connection successful.");

    // Check if superadmin already exists
    log("Checking for existing superadmin account...");
    const existingSuperAdmin = await User.findOne({
      role: "superadmin",
    }).lean();
    if (existingSuperAdmin) {
      log(`Superadmin already exists: ${existingSuperAdmin.email}`, "warn");
      return;
    }

    // Check for existing user with the same email
    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) {
      log(
        `Email ${email} is already registered with role ${existingUser.role}. Exiting.`,
        "error"
      );
      process.exit(1);
    }

    // Hash password
    log("Hashing password...");
    const hashedPassword = await argon2.hash(password, {
      // Align with your User model's Argon2 settings
      memoryCost: 19456, // Default for argon2id
      timeCost: 2,
      parallelism: 1,
    });
    log("Password hashed successfully.");

    // Create superadmin document
    log("Creating superadmin account...");
    const superAdmin = new User({
      fullName,
      email,
      password: hashedPassword, // Set hashed password directly
      role: "superadmin",
      department,
      isApproved: true,
      status: "active",
      isEmailVerified: true,
    });

    // Bypass pre-save hook if necessary
    // If your pre-save hook rehashes the password, use updateOne to set the password directly
    await User.collection.insertOne({
      ...superAdmin.toObject(),
      password: hashedPassword, // Ensure the hashed password is stored
    });

    // Verify the saved user
    const savedUser = await User.findOne({ email }).select("+password");
    if (!savedUser) {
      throw new Error("Failed to verify superadmin account creation.");
    }

    // Test password verification
    log("Verifying password hash...");
    const isMatch = await argon2.verify(savedUser.password, password);
    if (!isMatch) {
      throw new Error("Password verification failed after account creation.");
    }
    log("Password verification successful.");

    log(`Superadmin account created successfully with ID: ${savedUser._id}`);
  } catch (error) {
    log(`Setup script failed: ${error.message}`, "error");
    if (error.stack) {
      console.error(error.stack);
    }
    process.exitCode = 1;
  } finally {
    // Disconnect from database
    if (connection) {
      log("Disconnecting from database...");
      await mongoose.disconnect();
      log("Database disconnected.");
    }
    rl.close();
  }
};

// --- Run the script ---
setupSuperAdmin().catch((error) => {
  log(`Unexpected error: ${error.message}`, "error");
  process.exit(1);
});
