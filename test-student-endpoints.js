// filepath: /home/swadhin/r/test-student-endpoints.js
import fs from "fs";
import fetch from "node-fetch";

// Configuration
const BASE_URL = process.env.API_URL || "http://localhost:30000";
const TOKEN_FILE = "./student-token.txt";
const RESULTS_FILE = "./student-endpoints-test-results.json";

// Student private endpoints to test
const STUDENT_ENDPOINTS = [
  { method: "GET", path: "/api/student/profile", name: "Get student profile" },
  {
    method: "PUT",
    path: "/api/student/profile",
    name: "Update student profile",
    body: { fullName: "Test Student" },
  },
  { method: "GET", path: "/api/student/team", name: "Get student team" },
  {
    method: "POST",
    path: "/api/student/team/create",
    name: "Create team",
    body: { name: "Test Team", description: "Test team description" },
  },
  {
    method: "POST",
    path: "/api/student/team/invite",
    name: "Invite to team",
    body: { studentId: "6xyz123", message: "Join our team!" },
  },
  {
    method: "GET",
    path: "/api/student/team/invitations",
    name: "Get team invitations",
  },
  {
    method: "POST",
    path: "/api/student/team/respond-to-invitation",
    name: "Respond to invitation",
    body: { invitationId: "6xyz123", response: "accept" },
  },
  {
    method: "POST",
    path: "/api/student/team/remove-member",
    name: "Remove team member",
    body: { memberId: "6xyz123" },
  },
  { method: "POST", path: "/api/student/team/leave-team", name: "Leave team" },
  {
    method: "GET",
    path: "/api/student/team/available-students",
    name: "Get available students",
  },
  {
    method: "POST",
    path: "/api/student/projects",
    name: "Create project",
    body: {
      name: "Test Project",
      description: "Test project description",
      type: "research",
    },
  },
  {
    method: "POST",
    path: "/api/student/projects/6xyz123/submit",
    name: "Submit project",
    body: {
      title: "Project Submission",
      fileUrl: "https://example.com/file.pdf",
    },
  },
  { method: "GET", path: "/api/student/deadlines", name: "Get deadlines" },
];

// Utility to get stored token
const getToken = () => {
  try {
    return fs.existsSync(TOKEN_FILE)
      ? fs.readFileSync(TOKEN_FILE, "utf8").trim()
      : null;
  } catch (error) {
    console.error("Error reading token file:", error);
    return null;
  }
};

// Utility to make API requests
async function makeRequest(endpoint, useToken = false) {
  try {
    const token = useToken ? getToken() : null;
    const headers = {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };

    const options = {
      method: endpoint.method,
      headers,
      ...(endpoint.body && { body: JSON.stringify(endpoint.body) }),
    };

    const response = await fetch(`${BASE_URL}${endpoint.path}`, options);
    const status = response.status;

    let data = null;
    try {
      data = await response.json();
    } catch (e) {
      // Response may not be JSON
    }

    return { status, data };
  } catch (error) {
    return { status: "ERROR", error: error.message };
  }
}

// Test a single endpoint
async function testEndpoint(endpoint) {
  console.log(
    `\n🔍 Testing: ${endpoint.name} (${endpoint.method} ${endpoint.path})`
  );

  // Test without token (should be 401)
  console.log("  Testing without token...");
  const noTokenResult = await makeRequest(endpoint, false);
  const noTokenSuccess = noTokenResult.status === 401;
  console.log(
    `  ${noTokenSuccess ? "✅" : "❌"} Without token: ${noTokenResult.status} ${
      noTokenSuccess ? "(correctly denied)" : "(SECURITY ISSUE - should be 401)"
    }`
  );

  // Test with token (should be 200, 201, etc.)
  console.log("  Testing with token...");
  const withTokenResult = await makeRequest(endpoint, true);
  const withTokenSuccess =
    withTokenResult.status >= 200 && withTokenResult.status < 300;
  console.log(
    `  ${withTokenSuccess ? "✅" : "❌"} With token: ${
      withTokenResult.status
    } ${
      withTokenSuccess
        ? "(correctly accessed)"
        : "(ERROR - should allow access)"
    }`
  );

  return {
    endpoint: endpoint.name,
    path: endpoint.path,
    method: endpoint.method,
    noToken: {
      status: noTokenResult.status,
      success: noTokenSuccess,
    },
    withToken: {
      status: withTokenResult.status,
      success: withTokenSuccess,
    },
    overallResult: noTokenSuccess && withTokenSuccess ? "PASS" : "FAIL",
  };
}

// Main testing function
async function runTests() {
  console.log("\n🔒 TESTING STUDENT PRIVATE ENDPOINTS AUTHENTICATION 🔒");
  console.log("=======================================================");

  // Check if we have a token
  const token = getToken();
  if (!token) {
    console.error(
      "❌ No student authentication token found. Please run setup-test-user.js first or create a student-token.txt file with a valid JWT token."
    );
    process.exit(1);
  }
  console.log(`✅ Found authentication token. Length: ${token.length}`);

  // Run tests for each endpoint
  const results = [];
  for (const endpoint of STUDENT_ENDPOINTS) {
    const result = await testEndpoint(endpoint);
    results.push(result);
  }

  // Save results to file
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
  console.log(`\n📝 Results saved to ${RESULTS_FILE}`);

  // Print summary
  const passedTests = results.filter((r) => r.overallResult === "PASS").length;
  const totalTests = results.length;
  const passRatio = Math.round((passedTests / totalTests) * 100);

  console.log("\n📊 TEST SUMMARY");
  console.log("=================");
  console.log(
    `✅ Passed: ${passedTests}/${totalTests} endpoints (${passRatio}%)`
  );

  if (passedTests === totalTests) {
    console.log(
      "\n🎉 SUCCESS: All student endpoints are properly protected with authentication!"
    );
  } else {
    console.log(
      "\n⚠️ WARNING: Some endpoints are not properly protected. Check results for details."
    );
    const failedEndpoints = results
      .filter((r) => r.overallResult === "FAIL")
      .map((r) => r.path)
      .join("\n  - ");
    console.log(`\nFailed endpoints:\n  - ${failedEndpoints}`);
  }
}

// Execute the tests
runTests().catch((error) => {
  console.error("Error running tests:", error);
  process.exit(1);
});
