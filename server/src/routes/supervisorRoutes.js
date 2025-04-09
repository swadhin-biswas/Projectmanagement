import { t } from "elysia";
import {
  getAssignedStudents,
  getAssignedTeams,
  getSupervisorAnalytics,
  getSupervisorProfile,
  getTeamDetails,
} from "../controllers/supervisorController.js";
import { ForbiddenError, UnauthorizedError } from "../utils/errors.js";

// Define reusable guards (similar to authRoutes)
const isAuthenticated = ({ jwt, set }) => {
  if (!jwt) {
    set.status = 401;
    throw new UnauthorizedError("Authentication required");
  }
};

const isSupervisor = ({ jwt, set }) => {
  // This guard assumes isAuthenticated has already run or is run just before it
  if (jwt?.payload?.role !== "supervisor") {
    set.status = 403;
    throw new ForbiddenError("Forbidden: Supervisor access required");
  }
};

// Define common response schemas using 't'
const SupervisorProfileSchema = t.Object({
  // Define based on expected output of getSupervisorProfile
  // This is a placeholder - adjust based on actual controller response
  _id: t.String(),
  fullName: t.String(),
  email: t.String(),
  department: t.String(),
  specialization: t.Optional(t.String()),
  // ... add other fields ...
});

const StudentSchema = t.Object({
  /* Define student structure */ _id: t.String(),
  name: t.String(),
});
const TeamSchema = t.Object({
  /* Define team structure */ _id: t.String(),
  name: t.String(),
});

// --- Supervisor Routes ---
export default function supervisorRoutes(app) {
  return app.group(
    "/api/supervisor",
    (group) =>
      group
        // Apply authentication and role check to the entire group
        .onBeforeHandle([isAuthenticated, isSupervisor])

        // GET /api/supervisor/students
        .get(
          "/students",
          async ({ jwt, query }) => {
            // Pass necessary context parts to controller
            return getAssignedStudents({ user: jwt.payload, query });
          },
          {
            detail: { tags: ["Supervisor"], summary: "Get assigned students" },
            response: { 200: t.Array(StudentSchema) /* Placeholder */ },
            // Add query schema if needed: query: t.Object({...})
          }
        )

        // GET /api/supervisor/teams
        .get(
          "/teams",
          async ({ jwt, query }) => {
            return getAssignedTeams({ user: jwt.payload, query });
          },
          {
            detail: { tags: ["Supervisor"], summary: "Get assigned teams" },
            response: { 200: t.Array(TeamSchema) /* Placeholder */ },
            // Add query schema if needed
          }
        )

        // GET /api/supervisor/teams/:teamId
        .get(
          "/teams/:teamId",
          async ({ jwt, params }) => {
            return getTeamDetails({ user: jwt.payload, params });
          },
          {
            params: t.Object({ teamId: t.String() }),
            detail: {
              tags: ["Supervisor"],
              summary: "Get specific team details",
            },
            response: { 200: TeamSchema /* Placeholder */ },
          }
        )

        // GET /api/supervisor/analytics
        .get(
          "/analytics",
          async ({ jwt, query }) => {
            return getSupervisorAnalytics({ user: jwt.payload, query });
          },
          {
            detail: {
              tags: ["Supervisor"],
              summary: "Get supervisor analytics",
            },
            response: { 200: t.Object({}) /* Placeholder */ },
            // Add query schema if needed
          }
        )

        // GET /api/supervisor/profile
        .get(
          "/profile",
          async ({ jwt }) => {
            return getSupervisorProfile({ user: jwt.payload });
          },
          {
            detail: { tags: ["Supervisor"], summary: "Get supervisor profile" },
            response: { 200: SupervisorProfileSchema /* Placeholder */ },
          }
        )

    // --- TODO: Refactor PUT, POST routes below ---
    // .put("/profile", ...)
    // .put("/teams/:teamId/progress", ...)
    // .post("/feedback", ...)
    // .post("/meetings", ...)
    // .post("/email", ...)
    // .post("/notifications", ...)
    // .post("/documents", ...)
  );
}
