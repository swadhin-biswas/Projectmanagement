#!/usr/bin/env node

/**
 * Simple HTTP client for testing specific API endpoints with JWT auth
 * Usage:
 *   ./test-specific-endpoint.js GET /api/admin/users admin
 *   ./test-specific-endpoint.js POST /api/auth/logout student
 */

const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");

// Configuration
const API_HOST = "localhost";
const API_PORT = 30000;
const API_PROTOCOL = "http";
const TEST_DIR = path.join(__dirname, "../test-results");

// ANSI colors
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

// Parse command line arguments
const [method = "GET", endpoint = "/", role = ""] = process.argv.slice(2);

// Ensure test directory exists
if (!fs.existsSync(TEST_DIR)) {
  fs.mkdirSync(TEST_DIR, { recursive: true });
}

/**
 * Get a stored token for a role
 */
function getToken(role) {
  const tokenFile = path.join(TEST_DIR, `${role}_token.txt`);
  if (fs.existsSync(tokenFile)) {
    return fs.readFileSync(tokenFile, "utf8").trim();
  }
  return null;
}

/**
 * Make an HTTP request to the API
 */
function makeRequest(method, path, headers = {}, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path,
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    };

    if (data) {
      data = typeof data === "string" ? data : JSON.stringify(data);
      options.headers["Content-Length"] = Buffer.byteLength(data);
    }

    const client = API_PROTOCOL === "https" ? https : http;
    const req = client.request(options, (res) => {
      const chunks = [];

      res.on("data", (chunk) => {
        chunks.push(chunk);
      });

      res.on("end", () => {
        const body = Buffer.concat(chunks).toString();
        let jsonBody;

        try {
          jsonBody = JSON.parse(body);
        } catch (err) {
          jsonBody = { raw: body };
        }

        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: jsonBody,
        });
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    if (data) {
      req.write(data);
    }

    req.end();
  });
}

/**
 * Save response to a file
 */
function saveResponse(name, data) {
  const filePath = path.join(TEST_DIR, `${name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`${colors.blue}Response saved to ${filePath}${colors.reset}`);
}

/**
 * Main test function
 */
async function testEndpoint() {
  console.log(
    `\n${colors.cyan}====================================${colors.reset}`
  );
  console.log(`${colors.cyan}Testing API Endpoint${colors.reset}`);
  console.log(
    `${colors.cyan}====================================${colors.reset}`
  );
  console.log(`Method: ${colors.yellow}${method}${colors.reset}`);
  console.log(`Endpoint: ${colors.yellow}${endpoint}${colors.reset}`);

  let headers = {};
  let requestName = endpoint.replace(/\//g, "_").substring(1) || "root";

  if (role) {
    const token = getToken(role);
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      console.log(`Role: ${colors.yellow}${role}${colors.reset} (with token)`);
      requestName = `${role}_${requestName}`;
    } else {
      console.log(
        `${colors.red}No token found for role: ${role}${colors.reset}`
      );
      console.log(
        `${colors.yellow}Proceeding without authentication${colors.reset}`
      );
      requestName = `no_auth_${requestName}`;
    }
  } else {
    console.log(
      `${colors.yellow}No role specified - testing without authentication${colors.reset}`
    );
    requestName = `no_auth_${requestName}`;
  }

  try {
    // Make the request
    console.log(`\n${colors.cyan}Making request...${colors.reset}`);
    const response = await makeRequest(method, endpoint, headers);

    // Print response
    console.log(`\n${colors.cyan}Response:${colors.reset}`);
    console.log(
      `Status: ${response.statusCode >= 400 ? colors.red : colors.green}${
        response.statusCode
      }${colors.reset}`
    );

    // Check for WWW-Authenticate header if 401
    if (response.statusCode === 401 && response.headers["www-authenticate"]) {
      console.log(
        `WWW-Authenticate: ${colors.yellow}${response.headers["www-authenticate"]}${colors.reset}`
      );
    }

    // Print response headers that are relevant for auth
    const authHeaders = [
      "authorization",
      "www-authenticate",
      "x-ratelimit-limit",
      "x-ratelimit-remaining",
    ];
    for (const header of authHeaders) {
      if (response.headers[header]) {
        console.log(
          `${header}: ${colors.yellow}${response.headers[header]}${colors.reset}`
        );
      }
    }

    // Print body
    console.log("\nResponse Body:");
    console.log(JSON.stringify(response.body, null, 2));

    // Save response
    saveResponse(requestName, {
      endpoint,
      method,
      role: role || "none",
      statusCode: response.statusCode,
      headers: response.headers,
      body: response.body,
    });

    // Analyze response based on expected behavior
    console.log(`\n${colors.cyan}Analysis:${colors.reset}`);

    if (
      !role &&
      endpoint.startsWith("/api/") &&
      !endpoint.startsWith("/api/auth/")
    ) {
      // Private API endpoints without token should return 401
      if (response.statusCode === 401) {
        console.log(
          `${colors.green}✓ Correct: API endpoint correctly requires authentication (401)${colors.reset}`
        );
      } else {
        console.log(
          `${colors.red}✗ Error: API endpoint should require authentication (expected 401, got ${response.statusCode})${colors.reset}`
        );
      }
    } else if (role && endpoint.startsWith(`/api/${role}/`)) {
      // Accessing role-specific endpoint with correct role should succeed
      if (response.statusCode >= 200 && response.statusCode < 400) {
        console.log(
          `${colors.green}✓ Correct: ${role} successfully accessed ${role}-specific endpoint${colors.reset}`
        );
      } else {
        console.log(
          `${colors.red}✗ Error: ${role} failed to access ${role}-specific endpoint (${response.statusCode})${colors.reset}`
        );
      }
    } else if (
      (role &&
        endpoint.startsWith("/api/admin/") &&
        role !== "admin" &&
        role !== "superadmin") ||
      (endpoint.startsWith("/api/student/") && role !== "student") ||
      (endpoint.startsWith("/api/supervisor/") && role !== "supervisor")
    ) {
      // Accessing role-specific endpoint with wrong role should return 403
      if (response.statusCode === 403) {
        console.log(
          `${colors.green}✓ Correct: ${role} correctly denied access to endpoint (403)${colors.reset}`
        );
      } else {
        console.log(
          `${colors.red}✗ Error: ${role} should be denied access (expected 403, got ${response.statusCode})${colors.reset}`
        );
      }
    }
  } catch (error) {
    console.error(`${colors.red}Error:${colors.reset}`, error.message);
  }
}

// Run the test
testEndpoint().catch(console.error);
