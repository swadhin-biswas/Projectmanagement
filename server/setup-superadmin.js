// setup-superadmin.js
import crypto from "crypto";
import { config } from "dotenv";
import fs from "fs/promises";
import fetch from "node-fetch";
import path from "path";
import readline from "readline";
import { fileURLToPath } from "url";

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.join(__dirname, ".env") });

// Setup readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Prompt user for input
const prompt = (question) =>
  new Promise((resolve) => rl.question(question, resolve));

async function setupSuperAdmin() {
  try {
    console.log("\n===== Super Admin Account Setup =====\n");

    // Check if setup key exists in environment
    let setupKey = process.env.SUPER_ADMIN_SETUP_KEY;

    if (!setupKey || setupKey.length < 32) {
      console.log("⚠️  No valid SUPER_ADMIN_SETUP_KEY found in .env file");
      console.log("Generating a secure setup key...");

      // Generate a secure random key
      setupKey = crypto.randomBytes(32).toString("hex");

      // Write this key to .env file if it exists
      try {
        const envPath = path.join(__dirname, ".env");
        const envExists = await fs
          .access(envPath)
          .then(() => true)
          .catch(() => false);

        if (envExists) {
          let envContent = await fs.readFile(envPath, "utf8");

          // Check if the key already exists in the file
          if (envContent.includes("SUPER_ADMIN_SETUP_KEY=")) {
            // Replace existing key
            envContent = envContent.replace(
              /SUPER_ADMIN_SETUP_KEY=.*/,
              `SUPER_ADMIN_SETUP_KEY=${setupKey}`
            );
          } else {
            // Add new key
            envContent += `\nSUPER_ADMIN_SETUP_KEY=${setupKey}\n`;
          }

          await fs.writeFile(envPath, envContent);
          console.log("🔑 New setup key written to .env file");
        } else {
          // Create new .env file with just this key
          await fs.writeFile(envPath, `SUPER_ADMIN_SETUP_KEY=${setupKey}\n`);
          console.log("🔑 Created new .env file with setup key");
        }
      } catch (error) {
        console.warn(
          "⚠️  Could not write setup key to .env file:",
          error.message
        );
      }
    }

    console.log("\nPlease provide details for the super admin account:");
    console.log("(Press Enter to use default values)\n");

    // Get user input with defaults
    const email =
      (await prompt("Email [superadmin@research.edu]: ")) ||
      "superadmin@research.edu";
    const defaultPassword = "SuperSecurePassword123!";
    const password =
      (await prompt("Password [SuperSecurePassword123!]: ")) || defaultPassword;
    const fullName =
      (await prompt("Full Name [Super Administrator]: ")) ||
      "Super Administrator";

    console.log("\n🔄 Creating super admin account...");

    // API URL from environment or default
    const apiUrl = process.env.API_URL || "http://localhost:3000";

    const response = await fetch(`${apiUrl}/api/setup/superadmin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Setup-Key": setupKey,
      },
      body: JSON.stringify({
        email,
        password,
        fullName,
      }),
    });

    const data = await response.json();

    if (response.status === 201) {
      console.log("\n✅ Super admin account created successfully!");
      console.log("=== Account Details ===");
      console.log(`Email: ${email}`);
      console.log(`Full Name: ${fullName}`);
      console.log(`Role: superadmin`);
      console.log("\n🔒 You can now log in with these credentials");

      // Save a login token if one was returned
      if (data.token) {
        console.log("✅ Authentication token received");
      }
    } else if (response.status === 409) {
      console.log("\n⚠️  A super admin account already exists");
      console.log(
        "If you need to reset the super admin account, please use the admin panel or database tools"
      );
    } else {
      console.log(`\n❌ Error: ${data.error || "Unknown error"}`);
      console.log("Status:", response.status);
      console.log("Response:", data);
    }
  } catch (error) {
    console.error("\n❌ Error setting up superadmin:", error.message);
    if (error.cause) {
      console.error("Cause:", error.cause);
    }
    console.log("\nPlease make sure:");
    console.log("1. The server is running");
    console.log(
      "2. The server is accessible at http://localhost:3000 (or set API_URL in .env)"
    );
    console.log(
      "3. SUPER_ADMIN_SETUP_KEY is properly set in .env on both client and server"
    );
  } finally {
    rl.close();
  }
}

// Run the setup
setupSuperAdmin();
