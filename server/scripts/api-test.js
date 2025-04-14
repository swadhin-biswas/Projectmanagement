import axios from "axios";
import chalk from "chalk";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import winston from "winston";
import "winston-daily-rotate-file";

// Configuration
const API/api_BASE_URL = "http://localhost:30000";
const TEST_USER = {
  email: "teststudent1@gmail.com",
  password: "TestUser21@@@",
};

// Setup directories
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOGS_DIR = path.join(__dirname, "..", "logs", "api/api-tests");

// Create logs directory if it doesn't exist
await fs.mkdir(LOGS_DIR, { recursive: true });

// Setup Winston logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: "api/api-testing" },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    // File transport with rotation
    new winston.transports.DailyRotateFile({
      filename: path.join(LOGS_DIR, "api/api-test-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "14d",
    }),
  ],
});

/**
 * API/api endpoints to test
 * Format: { method, path, description, body, expectedStatus, requiresAuth, role }
 */
const endpoints = [
  // Auth endpoints
  {
    method: "POST",
    path: "/api/api/auth/login",
    description: "Login",
    body: TEST_USER,
    expectedStatus: 200,
    requiresAuth: false,
  },
  {
    method: "GET",
    path: "/api/api/auth/profile",
    description: "Get user profile",
    expectedStatus: 200,
    requiresAuth: true,
  },

  // Teams endpoints
  {
    method: "GET",
    path: "/api/api/teams",
    description: "Get all teams",
    expectedStatus: 200,
    requiresAuth: true,
  },
  {
    method: "GET",
    path: "/api/api/teams/:teamId",
    description: "Get team details",
    expectedStatus: 200,
    requiresAuth: true,
    params: { teamId: null },
  },
  {
    method: "POST",
    path: "/api/api/teams",
    description: "Create team",
    body: { name: "Test Team", description: "Created during API/api test" },
    expectedStatus: 201,
    requiresAuth: true,
  },
  {
    method: "PUT",
    path: "/api/api/teams/:teamId",
    description: "Update team",
    body: { description: "Updated during API/api test" },
    expectedStatus: 200,
    requiresAuth: true,
    params: { teamId: null },
  },

  // Project endpoints
  {
    method: "GET",
    path: "/api/api/projects",
    description: "Get all projects",
    expectedStatus: 200,
    requiresAuth: true,
  },
  {
    method: "GET",
    path: "/api/api/projects/:projectId",
    description: "Get project details",
    expectedStatus: 200,
    requiresAuth: true,
    params: { projectId: null },
  },
  {
    method: "POST",
    path: "/api/api/projects",
    description: "Create project",
    body: { title: "Test Project", description: "Created during API/api test" },
    expectedStatus: 201,
    requiresAuth: true,
  },
  {
    method: "PUT",
    path: "/api/api/projects/:projectId",
    description: "Update project",
    body: { description: "Updated during API/api test" },
    expectedStatus: 200,
    requiresAuth: true,
    params: { projectId: null },
  },

  // Sessions endpoints
  {
    method: "GET",
    path: "/api/api/sessions",
    description: "Get all sessions",
    expectedStatus: 200,
    requiresAuth: true,
  },
  {
    method: "POST",
    path: "/api/api/sessions",
    description: "Create session",
    body: { name: "Test Session", startDate: new Date().toISOString() },
    expectedStatus: 201,
    requiresAuth: true,
  },

  // Notification endpoints
  {
    method: "GET",
    path: "/api/api/notifications",
    description: "Get user notifications",
    expectedStatus: 200,
    requiresAuth: true,
  },
  {
    method: "POST",
    path: "/api/api/notifications/mark-read",
    description: "Mark notifications as read",
    body: { all: true },
    expectedStatus: 200,
    requiresAuth: true,
  },

  // Dashboard endpoints
  {
    method: "GET",
    path: "/api/api/dashboard",
    description: "Get dashboard data",
    expectedStatus: 200,
    requiresAuth: true,
  },
  {
    method: "GET",
    path: "/api/api/dashboard/stats",
    description: "Get dashboard statistics",
    expectedStatus: 200,
    requiresAuth: true,
  },

  // User management endpoints
  {
    method: "GET",
    path: "/api/api/users",
    description: "Get all users",
    expectedStatus: 200,
    requiresAuth: true,
  },
  {
    method: "GET",
    path: "/api/api/users/me",
    description: "Get current user details",
    expectedStatus: 200,
    requiresAuth: true,
  },

  // Report endpoints
  {
    method: "GET",
    path: "/api/api/reports",
    description: "Get all reports",
    expectedStatus: 200,
    requiresAuth: true,
  },
  {
    method: "POST",
    path: "/api/api/reports",
    description: "Submit a report",
    body: { title: "Test Report", content: "Generated during API/api test" },
    expectedStatus: 201,
    requiresAuth: true,
  },

  // Feedback endpoints
  {
    method: "GET",
    path: "/api/api/feedback",
    description: "Get all feedback",
    expectedStatus: 200,
    requiresAuth: true,
  },
  {
    method: "POST",
    path: "/api/api/feedback",
    description: "Submit feedback",
    body: { content: "Test feedback submitted during API/api test" },
    expectedStatus: 201,
    requiresAuth: true,
  },
];

/**
 * Execute an API/api request
 */
async function makeRequest(endpoint, token = null, dynamicParams = {}) {
  const headers = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Replace path parameters with actual values
  let url = endpoint.path;
  if (endpoint.params) {
    Object.entries(endpoint.params).forEach(([key, value]) => {
      const actualValue = dynamicParams[key] || value;
      if (actualValue) {
        url = url.replace(`:${key}`, actualValue);
      }
    });
  }

  try {
    // Create full URL
    const fullUrl = `${API/api_BASE_URL}${url}`;

    // Log request
    logger.info(`📤 REQUEST: ${endpoint.method} ${fullUrl}`);

    // Execute request based on method
    let response;
    switch (endpoint.method) {
      case "GET":
        response = await axios.get(fullUrl, { headers });
        break;
      case "POST":
        response = await axios.post(fullUrl, endpoint.body, { headers });
        break;
      case "PUT":
        response = await axios.put(fullUrl, endpoint.body, { headers });
        break;
      case "DELETE":
        response = await axios.delete(fullUrl, { headers });
        break;
      default:
        throw new Error(`Unsupported method: ${endpoint.method}`);
    }

    // Log success
    logger.info(`✅ SUCCESS: ${endpoint.method} ${url} - ${response.status}`);
    logger.debug("Response data:", response.data);

    return {
      success: true,
      status: response.status,
      data: response.data,
      endpoint,
    };
  } catch (error) {
    // Log error
    const status = error.response?.status || 500;
    const data = error.response?.data || { error: error.message };

    logger.error(`❌ ERROR: ${endpoint.method} ${url} - ${status}`);
    logger.error("Error details:", data);

    return {
      success: false,
      status,
      data,
      endpoint,
      error: error.message,
    };
  }
}

/**
 * Run all API/api tests
 */
async function runTests() {
  logger.info("�� Starting API/api tests for private/protected endpoints");

  const results = {
    passed: [],
    failed: [],
    timestamp: new Date().toISOString(),
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
    },
  };

  let authToken = null;
  const dynamicParams = {};

  // Login first to get auth token
  const loginEndpoint = endpoints.find((e) => e.path === "/api/api/auth/login");
  if (loginEndpoint) {
    const loginResult = await makeRequest(loginEndpoint);
    if (loginResult.success && loginResult.data?.token) {
      authToken = loginResult.data.token;
      console.log(
        chalk.green("✓ Successfully logged in and obtained auth token")
      );
      logger.info("Authentication successful, token obtained");
    } else {
      console.log(
        chalk.red(
          "✗ Failed to obtain auth token. Cannot test protected endpoints."
        )
      );
      logger.error(
        "Authentication failed, cannot proceed with protected endpoint testing"
      );
      return results;
    }
  }

  // Run all other tests
  for (const endpoint of endpoints) {
    // Skip login endpoint as it was already tested
    if (endpoint.path === "/api/api/auth/login") continue;

    // Execute request
    const result = await makeRequest(
      endpoint,
      endpoint.requiresAuth ? authToken : null,
      dynamicParams
    );

    // Update dynamic parameters for future requests if needed
    if (result.success && result.data?.data) {
      // Extract team ID from create team response
      if (endpoint.path === "/api/api/teams" && endpoint.method === "POST") {
        dynamicParams.teamId = result.data.data?._id || result.data.data?.id;
      }
      // Or extract team ID from teams list
      else if (
        endpoint.path === "/api/api/teams" &&
        endpoint.method === "GET" &&
        Array.isArray(result.data.data)
      ) {
        const teams = result.data.data;
        if (teams.length > 0) {
          dynamicParams.teamId = teams[0]._id || teams[0].id;
        }
      }

      // Extract project ID from create project response
      if (endpoint.path === "/api/api/projects" && endpoint.method === "POST") {
        dynamicParams.projectId = result.data.data?._id || result.data.data?.id;
      }
      // Or extract project ID from projects list
      else if (
        endpoint.path === "/api/api/projects" &&
        endpoint.method === "GET" &&
        Array.isArray(result.data.data)
      ) {
        const projects = result.data.data;
        if (projects.length > 0) {
          dynamicParams.projectId = projects[0]._id || projects[0].id;
        }
      }
    }

    // Track result
    const passed = result.success && result.status === endpoint.expectedStatus;
    if (passed) {
      results.passed.push(result);
      console.log(
        chalk.green(
          `✓ ${endpoint.method} ${endpoint.path} - ${endpoint.description}`
        )
      );
    } else {
      results.failed.push(result);
      console.log(
        chalk.red(
          `✗ ${endpoint.method} ${endpoint.path} - ${endpoint.description} (${result.status})`
        )
      );
    }
  }

  // Update summary
  results.summary.total = endpoints.length - 1; // Exclude login endpoint from count
  results.summary.passed = results.passed.length;
  results.summary.failed = results.failed.length;

  // Save results to file
  const resultsFile = path.join(
    LOGS_DIR,
    `api/api-test-results-${new Date().toISOString().split("T")[0]}.json`
  );
  await fs.writeFile(resultsFile, JSON.stringify(results, null, 2));

  // Log summary
  logger.info(
    `📊 Test Summary: ${results.summary.passed}/${results.summary.total} tests passed`
  );
  console.log("\n");
  console.log(chalk.bold("📊 Protected Endpoint Test Summary:"));
  console.log(
    chalk.bold(
      `  Total protected endpoints tested: ${chalk.blue(results.summary.total)}`
    )
  );
  console.log(chalk.bold(`  Passed: ${chalk.green(results.summary.passed)}`));
  console.log(chalk.bold(`  Failed: ${chalk.red(results.summary.failed)}`));
  console.log(chalk.bold(`  Results saved to: ${chalk.blue(resultsFile)}`));

  return results;
}

// Run the tests
await runTests();
