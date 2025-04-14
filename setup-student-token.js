import fs from "fs";
import fetch from "node-fetch";

// Configuration
const BASE_URL = process.env.API_URL || "http://localhost:30000";
const TOKEN_FILE = "./student-token.txt";

// Student credentials - replace these with a valid student account
const studentCredentials = {
  email: "teststudent1@gmail.com",
  password: "TestUser21@@@",
};

async function getStudentToken() {
  console.log("🔑 Getting student authentication token...");

  try {
    // Attempt to login and get token
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(studentCredentials),
    });

    if (!response.ok) {
      throw new Error(
        `Login failed: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    if (!data.token || !data.user) {
      throw new Error("Invalid response: No token or user data returned");
    }

    if (data.user.role !== "student") {
      throw new Error(
        `Invalid user role: ${data.user.role} (expected 'student')`
      );
    }

    // Save token to file
    fs.writeFileSync(TOKEN_FILE, data.token);

    console.log("✅ Student token acquired successfully!");
    console.log(`✅ Token saved to ${TOKEN_FILE}`);
    console.log(`✅ User: ${data.user.fullName} (${data.user.email})`);
    console.log(`✅ Role: ${data.user.role}`);

    return data.token;
  } catch (error) {
    console.error("❌ Error getting student token:", error.message);
    console.error("\nPlease make sure:");
    console.error("1. The server is running");
    console.error("2. The API URL is correct");
    console.error("3. Student credentials are valid");
    console.error(
      "\nIf needed, register a student account first or use an existing one."
    );

    // You can uncomment this to register a new student account if needed
    // await registerStudent();

    process.exit(1);
  }
}

// Registration helper function (optional - uncomment if needed)
async function registerStudent() {
  console.log(
    "\n👤 No valid student account found. Attempting to register a new student..."
  );

  const newStudentData = {
    fullName: "Test Student",
    email: "teststudent@example.com",
    password: "TestStudent123!",
    role: "student",
    department: "Computer Science",
    studentId: "S" + Math.floor(10000 + Math.random() * 90000),
  };

  try {
    const response = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newStudentData),
    });

    if (!response.ok) {
      throw new Error(
        `Registration failed: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log("✅ New student registered successfully!");
    console.log(`✅ Email: ${newStudentData.email}`);
    console.log(`✅ Password: ${newStudentData.password}`);

    // Update credentials and try login again
    studentCredentials.email = newStudentData.email;
    studentCredentials.password = newStudentData.password;

    return getStudentToken();
  } catch (error) {
    console.error("❌ Student registration failed:", error.message);
    process.exit(1);
  }
}

// Execute the script
getStudentToken().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
