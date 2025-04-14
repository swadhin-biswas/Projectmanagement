import Elysia from "elysia";
import { getTeamDetails } from "../controllers/teamController";
import { requireAuth } from "../src/utils/authUtils.js";

export const teamRoutes = new Elysia({ prefix: "/teams" })
  // GET /teams/:teamId - Using our standardized auth utility
  .get("/:teamId", async (context) => {
    try {
      // Use the standard auth utility to ensure user is authenticated
      const user = requireAuth(context);

      // Pass both context and authenticated user to controller
      return await getTeamDetails({ ...context, user });
    } catch (error) {
      context.set.status = error.status || 500;
      return {
        success: false,
        error: error.message || "Failed to get team details",
      };
    }
  });

// Add other team routes here with proper authentication
