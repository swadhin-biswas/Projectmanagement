// Setup test user for authentication tests
import { fetch } from "bun";

// Test user credentials
const testUser = {
  email: "admin@example.com",
  password: "Admin123!",
  fullName: "Admin User",
  role: "admin",
  department: "Computer Science",
};

// Server URL
const BASE_URL = process.env.API_URL || "http://localhost:30000";

async function setupTestUser() {
  console.log("Setting up test user for authentication tests...");

  try {
    // Try to register the user
    console.log(`Registering test user: ${testUser.email}`);

    const registerResponse = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testUser),
    });

    if (registerResponse.ok) {
      const data = await registerResponse.json();
      console.log("✅ Test user registration successful!");

      if (data.token) {
        console.log(`Token: ${data.token.substring(0, 20)}...`);
      }

      return true;
    } else if (registerResponse.status === 409) {
      console.log("⚠️ Test user already exists (409 Conflict)");

      // Try to login instead
      console.log("Attempting to login with existing user...");

      const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password,
        }),
      });

      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        console.log("✅ Login successful!");

        if (loginData.token) {
          console.log(`Token: ${loginData.token.substring(0, 20)}...`);
        }

        return true;
      } else {
        console.log(`❌ Login failed with status: ${loginResponse.status}`);
        return false;
      }
    } else {
      console.log(
        `❌ Registration failed with status: ${registerResponse.status}`
      );

      try {
        const errorData = await registerResponse.json();
        console.log("Error details:", JSON.stringify(errorData, null, 2));
      } catch (e) {
        console.log("Could not parse error response");
      }

      return false;
    }
  } catch (error) {
    console.error("Error setting up test user:", error);
    return false;
  }
}

// Run the setup
setupTestUser().then((success) => {
  if (success) {
    console.log("✅ Test user setup completed successfully");
    process.exit(0);
  } else {
    console.log("❌ Test user setup failed");
    process.exit(1);
  }
});
