// Get authentication token for testing
import { fetch } from "bun";

// Test user credentials
const testUser = {
  email: "admin@example.com",
  password: "Admin123!",
};

// Server URL
const BASE_URL = process.env.API_URL || "http://localhost:30000";

async function getToken() {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testUser),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.token) {
        // Only output the token, with no other text, for use in scripts
        console.log(data.token);
        return true;
      }
    }

    // Authentication failed
    console.error("Failed to authenticate");
    return false;
  } catch (error) {
    console.error("Error getting token:", error.message);
    return false;
  }
}

// Run the function
getToken().then((success) => {
  // Only exit with error code if needed - don't print anything else
  if (!success) process.exit(1);
  process.exit(0);
});
