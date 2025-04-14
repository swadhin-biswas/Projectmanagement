// filepath: /home/swadhin/r/test-auth-enforcement.js
import fetch from "node-fetch";

// Base URL for the API
const BASE_URL = process.env.API_URL || "http://localhost:30000";

// List of private endpoints to test (not exhaustive, add more as needed)
const privateEndpoints = [
  "/api/projects",
  "/api/student/profile",
  "/api/teams",
  "/api/calendar/deadlines",
  "/api/messages/teams",
  "/api/calendar-service/status",
  "/api/dashboard",
  "/api/supervisor/profile",
];

// List of public endpoints that should NOT require authentication
const publicEndpoints = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/reset-password-request",
  "/health/db",
];

/**
 * Tests if an endpoint requires authentication
 * @param {string} endpoint - The endpoint to test
 * @param {boolean} shouldRequireAuth - Whether the endpoint should require auth
 * @returns {Promise<boolean>} - Whether the test passed
 */
async function testEndpoint(endpoint, shouldRequireAuth) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const requiresAuth = response.status === 401;
    const passed = shouldRequireAuth ? requiresAuth : !requiresAuth;

    console.log(`Testing ${endpoint}: ${passed ? "✅ PASS" : "❌ FAIL"}`);
    console.log(
      `  Status: ${response.status}, Should require auth: ${shouldRequireAuth}, Does require auth: ${requiresAuth}`
    );

    return passed;
  } catch (error) {
    console.error(`Error testing ${endpoint}:`, error.message);
    return false;
  }
}

async function runTests() {
  console.log("=== TESTING PRIVATE ENDPOINTS (should require auth) ===\n");
  let privateResults = 0;
  for (const endpoint of privateEndpoints) {
    if (await testEndpoint(endpoint, true)) {
      privateResults++;
    }
  }

  console.log("\n=== TESTING PUBLIC ENDPOINTS (should NOT require auth) ===\n");
  let publicResults = 0;
  for (const endpoint of publicEndpoints) {
    if (await testEndpoint(endpoint, false)) {
      publicResults++;
    }
  }

  console.log("\n=== RESULTS SUMMARY ===");
  console.log(
    `Private endpoints: ${privateResults}/${privateEndpoints.length} secured correctly`
  );
  console.log(
    `Public endpoints: ${publicResults}/${publicEndpoints.length} accessible correctly`
  );

  if (
    privateResults === privateEndpoints.length &&
    publicResults === publicEndpoints.length
  ) {
    console.log("\n✅ All authentication checks are working correctly!");
  } else {
    console.log("\n❌ Some endpoints are not properly secured or accessible!");
  }
}

// Run all tests
runTests().catch((error) => {
  console.error("Test execution error:", error);
});
