const fs = require("fs");
const path = require("path");
const axios = require("axios");

// Configuration
const BASE_URL = "http://localhost:3000"; // Update with your server URL
const AUTH_ENDPOINT = "/auth/login";
const CREDENTIALS = {
  email: "teststudent1@gmail.com",
  password: "TestUser21@@@",
};
const LOG_FILE = path.join(__dirname, "student-api-test-results.json");

// Student endpoints to test
const studentEndpoints = [
  { method: "GET", path: "/students/team", description: "Get student team" },
  {
    method: "GET",
    path: "/students/invitations",
    description: "Get pending invitations",
  },
  {
    method: "GET",
    path: "/students/profile",
    description: "Get student profile",
  },
  {
    method: "GET",
    path: "/students/projects",
    description: "Get student projects",
  },
  {
    method: "GET",
    path: "/students/calendar",
    description: "Get student calendar",
  },
  {
    method: "GET",
    path: "/students/notifications",
    description: "Get student notifications",
  },
  {
    method: "GET",
    path: "/students/dashboard",
    description: "Get student dashboard",
  },
  {
    method: "GET",
    path: "/students/activities",
    description: "Get student activities",
  },
];

// Main function to run the tests
async function runTests() {
  const results = {
    timestamp: new Date().toISOString(),
    authentication: null,
    endpoints: [],
    summary: {
      total: studentEndpoints.length,
      successful: 0,
      failed: 0,
    },
  };

  let authToken = null;

  try {
    // Step 1: Authenticate
    console.log("🔑 Authenticating...");
    const authResponse = await axios.post(
      `${BASE_URL}${AUTH_ENDPOINT}`,
      CREDENTIALS
    );

    if (authResponse.data && authResponse.data.token) {
      authToken = authResponse.data.token;
      results.authentication = {
        success: true,
        user: authResponse.data.user,
        message: "Successfully authenticated",
      };
      console.log("✅ Authentication successful");
    } else {
      results.authentication = {
        success: false,
        error: "No token received",
        response: authResponse.data,
      };
      console.error("❌ Authentication failed - No token received");
      saveResults(results);
      return;
    }
  } catch (error) {
    results.authentication = {
      success: false,
      error: error.message,
      response: error.response?.data || null,
    };
    console.error("❌ Authentication failed:", error.message);
    saveResults(results);
    return;
  }

  // Step 2: Test each endpoint
  console.log("\n📋 Testing student endpoints...");

  for (const endpoint of studentEndpoints) {
    const testResult = {
      endpoint: endpoint.path,
      method: endpoint.method,
      description: endpoint.description,
      success: false,
      status: null,
      data: null,
      error: null,
      duration: 0,
    };

    try {
      console.log(`🔄 Testing ${endpoint.method} ${endpoint.path}...`);
      const startTime = Date.now();

      const response = await axios({
        method: endpoint.method.toLowerCase(),
        url: `${BASE_URL}${endpoint.path}`,
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const endTime = Date.now();
      testResult.duration = endTime - startTime;
      testResult.status = response.status;
      testResult.data = response.data;
      testResult.success = true;

      results.summary.successful++;
      console.log(
        `✅ ${endpoint.method} ${endpoint.path} - Status: ${response.status}`
      );
    } catch (error) {
      const endTime = Date.now();
      testResult.duration = endTime - startTime;
      testResult.status = error.response?.status || 0;
      testResult.error = {
        message: error.message,
        response: error.response?.data || null,
      };

      results.summary.failed++;
      console.error(
        `❌ ${endpoint.method} ${endpoint.path} - Error: ${error.message}`
      );
    }

    results.endpoints.push(testResult);
  }

  // Save results
  saveResults(results);
  console.log(
    `\n📊 Summary: ${results.summary.successful} successful, ${results.summary.failed} failed`
  );
  console.log(`📝 Results saved to ${LOG_FILE}`);
}

function saveResults(results) {
  fs.writeFileSync(LOG_FILE, JSON.stringify(results, null, 2));
}

// Run the tests
runTests().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
