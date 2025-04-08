// test-api-endpoints.js
import { config } from "dotenv";
import fs from "fs/promises";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.join(__dirname, ".env") });

// Configuration
const BASE_URL = process.env.API_URL || "http://localhost:3000";
const SETUP_KEY =
  process.env.SUPER_ADMIN_SETUP_KEY || "replace_with_your_setup_key";
const OUTPUT_FILE = path.join(__dirname, "api-test-results.json");

// Test results storage
const results = {
  passed: [],
  failed: [],
  skipped: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
  },
};

// Auth tokens for different roles
const tokens = {
  superadmin: null,
  admin: null,
  supervisor: null,
  student: null,
};

// Common headers
const headers = {
  "Content-Type": "application/json",
};

/**
 * Helper function to add auth token to headers if available
 */
function getHeaders(role = null) {
  const authHeaders = { ...headers };
  if (role && tokens[role]) {
    authHeaders["Authorization"] = `Bearer ${tokens[role]}`;
  }
  return authHeaders;
}

/**
 * Function to test a single endpoint
 */
async function testEndpoint(method, path, options = {}) {
  const {
    role = null,
    data = null,
    expectedStatus = 200,
    description = "",
    skipOnFailure = [],
  } = options;

  const url = `${BASE_URL}${path}`;

  try {
    console.log(
      `Testing ${method.toUpperCase()} ${path} ${role ? `as ${role}` : ""}`
    );

    const requestOptions = {
      method: method.toUpperCase(),
      headers: getHeaders(role),
      ...(data && { body: JSON.stringify(data) }),
    };

    const response = await fetch(url, requestOptions);
    const responseData = await response.json().catch(() => ({}));

    const success = response.status === expectedStatus;

    const resultDetails = {
      method: method.toUpperCase(),
      path,
      role,
      description,
      status: response.status,
      expected: expectedStatus,
      data: responseData,
      success,
    };

    if (success) {
      results.passed.push(resultDetails);
      results.summary.passed++;
      console.log(`✅ PASSED - ${method.toUpperCase()} ${path}`);
      return { success: true, data: responseData, response };
    } else {
      results.failed.push(resultDetails);
      results.summary.failed++;
      console.log(
        `❌ FAILED - ${method.toUpperCase()} ${path} - Expected: ${expectedStatus}, Got: ${
          response.status
        }`
      );

      // Mark dependent tests as skipped
      if (skipOnFailure.length > 0) {
        for (const skippedTest of skipOnFailure) {
          results.skipped.push({
            ...skippedTest,
            reason: `Dependent test failed: ${method.toUpperCase()} ${path}`,
          });
          results.summary.skipped++;
        }
      }

      return { success: false, data: responseData, response };
    }
  } catch (error) {
    const errorDetails = {
      method: method.toUpperCase(),
      path,
      role,
      description,
      error: error.message,
      expected: expectedStatus,
      success: false,
    };

    results.failed.push(errorDetails);
    results.summary.failed++;
    console.log(
      `❌ ERROR - ${method.toUpperCase()} ${path} - ${error.message}`
    );

    // Mark dependent tests as skipped
    if (skipOnFailure.length > 0) {
      for (const skippedTest of skipOnFailure) {
        results.skipped.push({
          ...skippedTest,
          reason: `Dependent test error: ${method.toUpperCase()} ${path} - ${
            error.message
          }`,
        });
        results.summary.skipped++;
      }
    }

    return { success: false, error: error.message };
  } finally {
    results.summary.total++;
  }
}

/**
 * Main function to run all tests
 */
async function runTests() {
  console.log("🧪 Starting API endpoint tests...");

  try {
    // 1. Test server health endpoint (no auth required)
    await testEndpoint("get", "/", {
      expectedStatus: 200,
      description: "API root health check",
    });

    await testEndpoint("get", "/health/db", {
      expectedStatus: 200,
      description: "Database health check",
    });

    // 2. Set up super admin account
    console.log("\n🔑 Setting up super admin account...");
    const setupResult = await testEndpoint("post", "/api/setup/superadmin", {
      data: {},
      expectedStatus: 201,
      description: "Create super admin account",
      headers: {
        ...headers,
        "X-Setup-Key": SETUP_KEY,
      },
    });

    if (setupResult.success && setupResult.data.token) {
      tokens.superadmin = setupResult.data.token;
      console.log("✅ Super admin setup successful");
    } else {
      console.log("⚠️ Super admin setup failed or account already exists");

      // Try logging in as super admin
      const loginResult = await testEndpoint("post", "/api/auth/login", {
        data: {
          email: "superadmin@research.edu",
          password: "SuperSecurePassword123!",
        },
        expectedStatus: 200,
        description: "Login as super admin",
      });

      if (loginResult.success && loginResult.data.token) {
        tokens.superadmin = loginResult.data.token;
        console.log("✅ Super admin login successful");
      }
    }

    // If we don't have a super admin token, most tests will fail
    if (!tokens.superadmin) {
      console.error(
        "❌ Failed to authenticate as Super Admin - most tests will fail"
      );
    }

    // 3. Test authentication endpoints
    console.log("\n🔐 Testing authentication endpoints...");

    // Create test users for different roles
    const roles = ["admin", "supervisor", "student"];

    for (const role of roles) {
      const email = `test-${role}-${Date.now()}@research.edu`;
      const password = "TestPassword123!";

      // Register a new user
      const registerResult = await testEndpoint("post", "/api/auth/register", {
        role: "superadmin",
        data: {
          email,
          password,
          fullName: `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`,
          role: role,
          department: "Computer Science",
        },
        expectedStatus: 201,
        description: `Register ${role} user`,
      });

      // If super admin, approve the supervisor
      if (role === "supervisor" && tokens.superadmin) {
        const supervisorId = registerResult.data.user?._id;
        if (supervisorId) {
          await testEndpoint(
            "put",
            `/api/admin/approve-supervisor/${supervisorId}`,
            {
              role: "superadmin",
              expectedStatus: 200,
              description: "Approve supervisor",
            }
          );
        }
      }

      // Login with the new user
      const loginResult = await testEndpoint("post", "/api/auth/login", {
        data: {
          email,
          password,
        },
        expectedStatus: 200,
        description: `Login as ${role}`,
      });

      if (loginResult.success && loginResult.data.token) {
        tokens[role] = loginResult.data.token;
        console.log(`✅ ${role} login successful`);
      }
    }

    // 4. Test user profile endpoint for each role
    console.log("\n👤 Testing user profile endpoints...");

    for (const role of ["superadmin", "admin", "supervisor", "student"]) {
      if (tokens[role]) {
        await testEndpoint("get", "/api/auth/profile", {
          role,
          expectedStatus: 200,
          description: `Get ${role} profile`,
        });
      }
    }

    // 5. Test admin endpoints
    console.log("\n👑 Testing admin endpoints...");

    await testEndpoint("get", "/api/admin/users", {
      role: "superadmin",
      expectedStatus: 200,
      description: "Get all users as superadmin",
    });

    await testEndpoint("get", "/api/admin/pending-supervisors", {
      role: "superadmin",
      expectedStatus: 200,
      description: "Get pending supervisors",
    });

    // 6. Test dashboard endpoints for different roles
    console.log("\n📊 Testing dashboard endpoints...");

    const dashboardRoles = ["admin", "supervisor", "student"];
    for (const role of dashboardRoles) {
      if (tokens[role]) {
        await testEndpoint("get", `/api/dashboard/${role}`, {
          role,
          expectedStatus: 200,
          description: `Get ${role} dashboard`,
        });
      }
    }

    // 7. Test analytics endpoints
    console.log("\n📈 Testing analytics endpoints...");

    await testEndpoint("get", "/api/analytics/admin/overview", {
      role: "admin",
      expectedStatus: 200,
      description: "Get admin analytics overview",
    });

    // 8. Test session endpoints
    console.log("\n🗓️ Testing session endpoints...");

    const sessionsResult = await testEndpoint("get", "/api/sessions", {
      role: "admin",
      expectedStatus: 200,
      description: "Get all sessions",
    });

    let sessionId = null;
    if (
      sessionsResult.success &&
      sessionsResult.data.data &&
      sessionsResult.data.data.length > 0
    ) {
      sessionId = sessionsResult.data.data[0]._id;

      await testEndpoint("get", `/api/sessions/${sessionId}`, {
        role: "admin",
        expectedStatus: 200,
        description: "Get session by ID",
      });
    } else {
      // Create a new session if none exists
      const createSessionResult = await testEndpoint("post", "/api/sessions", {
        role: "admin",
        data: {
          name: "Test Session",
          startDate: new Date().toISOString(),
          endDate: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
          description: "Test session created by API test script",
          isActive: true,
        },
        expectedStatus: 201,
        description: "Create new session",
      });

      if (createSessionResult.success && createSessionResult.data.data) {
        sessionId = createSessionResult.data.data._id;
      }
    }

    // 9. Test team endpoints
    console.log("\n👥 Testing team endpoints...");

    const teamsResult = await testEndpoint("get", "/api/teams", {
      role: "admin",
      expectedStatus: 200,
      description: "Get all teams",
    });

    let teamId = null;
    if (
      teamsResult.success &&
      teamsResult.data.data &&
      teamsResult.data.data.length > 0
    ) {
      teamId = teamsResult.data.data[0]._id;

      await testEndpoint("get", `/api/teams/${teamId}`, {
        role: "admin",
        expectedStatus: 200,
        description: "Get team by ID",
      });
    }

    // 10. Test project endpoints
    console.log("\n📝 Testing project endpoints...");

    const projectsResult = await testEndpoint("get", "/api/projects", {
      role: "admin",
      expectedStatus: 200,
      description: "Get all projects",
    });

    let projectId = null;
    if (
      projectsResult.success &&
      projectsResult.data.data &&
      projectsResult.data.data.length > 0
    ) {
      projectId = projectsResult.data.data[0]._id;

      await testEndpoint("get", `/api/projects/${projectId}`, {
        role: "admin",
        expectedStatus: 200,
        description: "Get project by ID",
      });
    }

    // 11. Test student endpoints
    console.log("\n🎓 Testing student endpoints...");

    if (tokens.student) {
      await testEndpoint("get", "/api/students/deadlines", {
        role: "student",
        expectedStatus: 200,
        description: "Get student deadlines",
      });
    }

    // 12. Test supervisor endpoints
    console.log("\n👨‍🏫 Testing supervisor endpoints...");

    if (tokens.supervisor) {
      await testEndpoint("get", "/api/supervisors/students", {
        role: "supervisor",
        expectedStatus: 200,
        description: "Get supervisor students",
      });
    }

    // 13. Test calendar endpoints
    console.log("\n📅 Testing calendar endpoints...");

    await testEndpoint("get", "/api/calendar/events", {
      role: "admin",
      expectedStatus: 200,
      description: "Get calendar events",
    });

    // 14. Test notification endpoints
    console.log("\n🔔 Testing notification endpoints...");

    await testEndpoint("get", "/api/notifications", {
      role: "admin",
      expectedStatus: 200,
      description: "Get notifications",
    });

    // 15. Test milestone endpoints
    console.log("\n🏆 Testing milestone endpoints...");

    await testEndpoint("get", "/api/milestones", {
      role: "admin",
      expectedStatus: 200,
      description: "Get all milestones",
    });

    // After all tests complete, save results to file
    console.log("\n💾 Saving test results...");

    // Calculate final summary
    results.summary = {
      total:
        results.passed.length + results.failed.length + results.skipped.length,
      passed: results.passed.length,
      failed: results.failed.length,
      skipped: results.skipped.length,
      timestamp: new Date().toISOString(),
    };

    await fs.writeFile(OUTPUT_FILE, JSON.stringify(results, null, 2));

    // Display summary
    console.log(`
    🧪 API Testing Results:
    ✅ Passed: ${results.summary.passed}
    ❌ Failed: ${results.summary.failed}
    ⏭️ Skipped: ${results.summary.skipped}
    📊 Total: ${results.summary.total}

    Full results saved to: ${OUTPUT_FILE}
    `);
  } catch (error) {
    console.error("❌ Test script error:", error);
  }
}

// Run all tests
runTests().catch(console.error);
