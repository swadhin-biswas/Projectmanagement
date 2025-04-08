import { Elysia } from "elysia";
import { setupSuperAdmin } from "../controllers/setupController.js";
import logger from "../utils/logger.js";

// Create setup routes with security measures
const setupRoutes = new Elysia({ prefix: "/api/setup" }).post(
  "/superadmin",
  setupSuperAdmin,
  {
    beforeHandle: ({ set, request }) => {
      logger.info("Super admin setup endpoint accessed", {
        ip: request.headers["x-forwarded-for"] || "unknown",
      });
    },
    detail: {
      summary: "Create a super admin account",
      description:
        "Creates the initial super admin account for the system. Requires a special setup key.",
      tags: ["Setup"],
    },
  }
);

export default setupRoutes;
