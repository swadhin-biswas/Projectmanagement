import { config } from 'dotenv';
config({ path: '../.env' });

import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import fs from "fs";
import jsonwebtoken from 'jsonwebtoken';
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import {
  getUserProfile,
  loginUser,
  registerUser,
  updateUserProfile,
} from "./controllers/authController.js";
import { setupSuperAdmin } from "./controllers/setupController.js";
import './models/Session.js';
import './models/Student.js';
import './models/Supervisor.js';
import './models/Team.js';
import './models/User.js';
import { dashboardRoutes } from "./routes/dashboardRoutes.js";
import { sessionRoutes } from "./routes/sessionRoutes.js";
import { ValidationError } from "./utils/errors.js";
import logger from "./utils/logger.js";

// Create logs directory if it doesn't exist
if (!fs.existsSync("logs")) {
  fs.mkdirSync("logs");
}

const Doc=`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Documentation | Swadhin Biswas</title>
    <style>
        :root {
            --dark-blue: #0a192f;
            --medium-blue: #172a45;
            --light-blue: #303c55;
            --highlight-blue: #64ffda;
            --white: #e6f1ff;
            --gray: #8892b0;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: var(--dark-blue);
            color: var(--white);
            line-height: 1.6;
        }

        header {
            background-color: var(--medium-blue);
            padding: 2rem 0;
            text-align: center;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .container {
            width: 90%;
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem 0;
        }

        h1 {
            font-size: 2.5rem;
            margin-bottom: 1rem;
            color: var(--highlight-blue);
        }

        h2 {
            font-size: 2rem;
            margin: 2rem 0 1rem;
            color: var(--highlight-blue);
            border-bottom: 2px solid var(--gray);
            padding-bottom: 0.5rem;
        }

        h3 {
            font-size: 1.5rem;
            margin: 1.5rem 0 1rem;
            color: var(--white);
        }

        p {
            margin-bottom: 1.5rem;
            color: var(--gray);
        }

        .endpoint {
            background-color: var(--light-blue);
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 1rem;
            transition: transform 0.3s ease;
        }

        .endpoint:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
        }

        .method {
            display: inline-block;
            padding: 0.3rem 0.6rem;
            border-radius: 4px;
            font-weight: bold;
            margin-right: 0.5rem;
        }

        .get {
            background-color: #61affe;
            color: #fff;
        }

        .post {
            background-color: #49cc90;
            color: #fff;
        }

        .put {
            background-color: #fca130;
            color: #fff;
        }

        .delete {
            background-color: #f93e3e;
            color: #fff;
        }

        .path {
            font-family: monospace;
            font-size: 1rem;
        }

        .description {
            margin-top: 0.5rem;
            color: var(--gray);
        }

        .section {
            margin-bottom: 3rem;
        }

        .profile {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background-color: var(--medium-blue);
            padding: 2rem;
            border-radius: 8px;
            margin-bottom: 2rem;
        }

        .profile-info {
            flex: 2;
        }

        .profile-image {
            flex: 1;
            text-align: center;
        }

        .profile-image img {
            width: 200px;
            height: 200px;
            border-radius: 50%;
            object-fit: cover;
            border: 4px solid var(--highlight-blue);
        }

        .social-links {
            display: flex;
            gap: 1rem;
            margin-top: 1rem;
        }

        .social-links a {
            color: var(--highlight-blue);
            text-decoration: none;
            transition: color 0.3s ease;
        }

        .social-links a:hover {
            color: var(--white);
        }

        footer {
            background-color: var(--medium-blue);
            text-align: center;
            padding: 2rem 0;
            margin-top: 4rem;
        }

        @media (max-width: 768px) {
            .profile {
                flex-direction: column-reverse;
                text-align: center;
            }

            .profile-image {
                margin-bottom: 2rem;
            }

            .social-links {
                justify-content: center;
            }
        }
    </style>
</head>
<body>
    <header>
        <div class="container">
            <h1>API Documentation</h1>
            <p>Comprehensive guide to our REST API endpoints</p>
        </div>
    </header>

    <div class="container">
        <section class="profile">
            <div class="profile-info">
                <h2>Swadhin Biswas</h2>
                <p>Full Stack Developer & API Architect</p>
                <p>Passionate about creating robust and scalable backend systems with clean, efficient APIs that power modern web applications.</p>
                <div class="social-links">
                    <a href="https://github.com/swadhinbiswas" target="_blank">GitHub</a>
                    <a href="https://linkedin.com/in/swadhinbiswas" target="_blank">LinkedIn</a>
                    <a href="mailto:contact@swadhinbiswas.com">Email</a>
                </div>
            </div>
            <div class="profile-image">
                <img src="https://avatars.githubusercontent.com/u/107450069?v=4" alt="Swadhin Biswas">
            </div>
        </section>

        <section class="section">
            <h2>Authentication Endpoints</h2>

            <div class="endpoint">
                <span class="method post">POST</span>
                <span class="path">/api/auth/register</span>
                <div class="description">Register a new user to the system.</div>
            </div>

            <div class="endpoint">
                <span class="method post">POST</span>
                <span class="path">/api/auth/login</span>
                <div class="description">Authenticate and log in a user.</div>
            </div>

            <div class="endpoint">
                <span class="method get">GET</span>
                <span class="path">/api/auth/profile</span>
                <div class="description">Retrieve the authenticated user's profile information.</div>
            </div>

            <div class="endpoint">
                <span class="method put">PUT</span>
                <span class="path">/api/auth/profile</span>
                <div class="description">Update the authenticated user's profile details.</div>
            </div>
        </section>

        <section class="section">
            <h2>Admin Endpoints</h2>

            <div class="endpoint">
                <span class="method get">GET</span>
                <span class="path">/api/admin/users</span>
                <div class="description">Get a list of all users in the system. Restricted to admin access.</div>
            </div>

            <div class="endpoint">
                <span class="method get">GET</span>
                <span class="path">/api/admin/pending-supervisors</span>
                <div class="description">Get a list of supervisor accounts awaiting approval.</div>
            </div>

            <div class="endpoint">
                <span class="method put">PUT</span>
                <span class="path">/api/admin/approve-supervisor/:id</span>
                <div class="description">Approve a pending supervisor account by ID.</div>
            </div>

            <div class="endpoint">
                <span class="method delete">DELETE</span>
                <span class="path">/api/admin/users/:id</span>
                <div class="description">Delete a user account from the system by ID.</div>
            </div>
        </section>

        <section class="section">
            <h2>Session Management</h2>

            <div class="endpoint">
                <span class="method post">POST</span>
                <span class="path">/api/sessions/</span>
                <div class="description">Create a new session. Admin only.</div>
            </div>

            <div class="endpoint">
                <span class="method get">GET</span>
                <span class="path">/api/sessions/</span>
                <div class="description">Get all sessions with optional filtering.</div>
            </div>

            <div class="endpoint">
                <span class="method get">GET</span>
                <span class="path">/api/sessions/:id</span>
                <div class="description">Get detailed information about a specific session by ID.</div>
            </div>

            <div class="endpoint">
                <span class="method put">PUT</span>
                <span class="path">/api/sessions/:id</span>
                <div class="description">Update a session's details. Admin only.</div>
            </div>

            <div class="endpoint">
                <span class="method post">POST</span>
                <span class="path">/api/sessions/:id/deadlines</span>
                <div class="description">Add or update deadlines for a session. Admin only.</div>
            </div>

            <div class="endpoint">
                <span class="method delete">DELETE</span>
                <span class="path">/api/sessions/:sessionId/deadlines/:deadlineId</span>
                <div class="description">Delete a specific deadline from a session. Admin only.</div>
            </div>

            <div class="endpoint">
                <span class="method post">POST</span>
                <span class="path">/api/sessions/:id/activate</span>
                <div class="description">Activate a session. Admin only.</div>
            </div>

            <div class="endpoint">
                <span class="method get">GET</span>
                <span class="path">/api/sessions/:id/analytics</span>
                <div class="description">Get analytics data for a specific session.</div>
            </div>
        </section>

        <section class="section">
            <h2>Student Endpoints</h2>

            <div class="endpoint">
                <span class="method get">GET</span>
                <span class="path">/api/dashboard/student</span>
                <div class="description">Get the student's dashboard information.</div>
            </div>

            <div class="endpoint">
                <span class="method post">POST</span>
                <span class="path">/api/student/create-team</span>
                <div class="description">Create a new team.</div>
            </div>

            <div class="endpoint">
                <span class="method post">POST</span>
                <span class="path">/api/student/join-team</span>
                <div class="description">Join an existing team.</div>
            </div>

            <div class="endpoint">
                <span class="method post">POST</span>
                <span class="path">/api/student/invite-to-team</span>
                <div class="description">Invite another student to join a team.</div>
            </div>

            <div class="endpoint">
                <span class="method post">POST</span>
                <span class="path">/api/student/create-project</span>
                <div class="description">Create a new project.</div>
            </div>

            <div class="endpoint">
                <span class="method post">POST</span>
                <span class="path">/api/student/submit-report</span>
                <div class="description">Submit a project report.</div>
            </div>

            <div class="endpoint">
                <span class="method get">GET</span>
                <span class="path">/api/student/messages</span>
                <div class="description">Get messages for the student.</div>
            </div>

            <div class="endpoint">
                <span class="method put">PUT</span>
                <span class="path">/api/student/messages/:messageId/read</span>
                <div class="description">Mark a message as read.</div>
            </div>
        </section>

        <section class="section">
            <h2>Supervisor Endpoints</h2>

            <div class="endpoint">
                <span class="method get">GET</span>
                <span class="path">/api/supervisor/students</span>
                <div class="description">Get a list of the supervisor's students.</div>
            </div>

            <div class="endpoint">
                <span class="method get">GET</span>
                <span class="path">/api/supervisor/teams</span>
                <div class="description">Get a list of the supervisor's teams.</div>
            </div>

            <div class="endpoint">
                <span class="method put">PUT</span>
                <span class="path">/api/supervisor/student-progress</span>
                <div class="description">Update a student's progress.</div>
            </div>

            <div class="endpoint">
                <span class="method post">POST</span>
                <span class="path">/api/supervisor/mark-student</span>
                <div class="description">Mark a student's work.</div>
            </div>

            <div class="endpoint">
                <span class="method post">POST</span>
                <span class="path">/api/supervisor/send-message</span>
                <div class="description">Send a message to a student.</div>
            </div>

            <div class="endpoint">
                <span class="method post">POST</span>
                <span class="path">/api/supervisor/review-report</span>
                <div class="description">Review a student's report.</div>
            </div>
        </section>

        <section class="section">
            <h2>System Setup</h2>

            <div class="endpoint">
                <span class="method post">POST</span>
                <span class="path">/api/setup/superadmin</span>
                <div class="description">Set up the super admin account for the system.</div>
            </div>

            <div class="endpoint">
                <span class="method get">GET</span>
                <span class="path">/</span>
                <div class="description">Root endpoint. Displays this landing page.</div>
            </div>
        </section>
    </div>

    <footer>
        <div class="container">
            <p>© 2025 Swadhin Biswas. All rights reserved.</p>
            <p>API Documentation and Student Project Management System</p>
        </div>
    </footer>
</body>
</html>`

// Define public paths that bypass authentication
const PUBLIC_PATHS = [
  "/",                  // Already included, just ensuring it's clear
  "/api/auth/login",
  "/api/auth/register",
  "/api/setup/superadmin",
];

// Authentication middleware
const auth = async ({ request, set }) => {
  const path = new URL(request.url).pathname;
  if (PUBLIC_PATHS.includes(path)) return {};

  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    set.status = 401;
    return { error: true, message: "No token provided" };
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = jsonwebtoken.verify(token, process.env.JWT_SECRET || "your-secret-key");
    if (!payload || !payload.userId) {
      set.status = 401;
      return { error: true, message: "Invalid token payload" };
    }

    const User = mongoose.model('User');
    const user = await User.findById(payload.userId).select('-password');
    if (!user) {
      set.status = 401;
      return { error: true, message: "User not found" };
    }

    if (user.role === 'supervisor' && !user.isApproved) {
      set.status = 401;
      return { error: true, message: "Account pending approval" };
    }

    return { user };
  } catch (err) {
    logger.error('Auth error:', err);
    set.status = 401;
    return { error: true, message: "Invalid token" };
  }
};

// Request tracking middleware
const requestTracker = () => ({ requestStart: Date.now() });

// Start the server
async function startServer() {
  try {
    await connectDB();

    const app = new Elysia()
      .use(cors({
        origin: ["http://localhost:5173"],
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        credentials: true,
        allowedHeaders: ["Content-Type", "Authorization", "Accept"]
      }))
      .derive(auth)
      .derive(requestTracker)
      .onError(({ code, error, set }) => {
        logger.error(`Error: ${code}`, error);
        if (error instanceof ValidationError) {
          set.status = 400;
          return { error: error.message };
        }
        set.status = code === "NOT_FOUND" ? 404 : 500;
        return { error: code === "NOT_FOUND" ? "Endpoint not found" : "Internal server error" };
      })
      .onAfterHandle(({ request, set, requestStart }) => {
        if (requestStart) {
          const responseTime = Date.now() - requestStart;
          logger.info(`${request.method} ${new URL(request.url).pathname} ${set.status} ${responseTime}ms`);
        }
      })
      // Log request body for debugging (optional)
      .onRequest(({ request, body }) => {
        logger.info(`Request to ${request.url} with body:`, body);
      });

    // Public root endpoint with DevVolop details
    app.get("/", () => {
      return new Response(Doc, {
        headers: {
          "Content-Type": "text/html",
          "Cache-Control": "no-store",
        },
      });
    });

    // Other public routes
    app.post("/api/auth/register", ({ body }) => registerUser(body));
    app.post("/api/auth/login", ({ body }) => loginUser(body));
    app.post("/api/setup/superadmin", async ({ body, headers, set }) => {
      const setupKey = headers['x-setup-key'];
      const result = await setupSuperAdmin(body, setupKey);
      if (result.error) {
        set.status = result.status || 400;
        return { error: result.error };
      }
      return result;
    });

    // Protected routes
    app.get("/api/auth/profile", ({ user }) => getUserProfile(user));
    app.put("/api/auth/profile", ({ body, user }) => updateUserProfile(body, user));

    // Grouped routes
    app.group('/api/sessions', app => sessionRoutes(app));
    app.group('/api/dashboard', app => dashboardRoutes(app));

    app.listen(3000);
    logger.info("Server is running at http://localhost:3000");

    return app;
  } catch (error) {
    logger.error("Server initialization error:", error.message, error.stack);
    process.exit(1);
  }
}

startServer();