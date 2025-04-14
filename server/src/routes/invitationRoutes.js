import { Elysia, t } from "elysia";
import * as teamController from "../controllers/teamController.js";
import logger from "../utils/logger.js";

// Common response schemas
const successResponse = t.Object({
  success: t.Boolean(),
  message: t.String(),
  data: t.Optional(t.Any()),
  timestamp: t.Optional(t.String()),
});

const errorResponse = t.Object({
  success: t.Boolean(),
  error: t.String(),
  timestamp: t.Optional(t.String()),
});

// Invitation schemas
const invitationSchema = t.Object({
  _id: t.String(),
  team: t.Object({
    _id: t.String(),
    name: t.String(),
    description: t.Optional(t.String()),
  }),
  invitedBy: t.Object({
    _id: t.String(),
    fullName: t.String(),
    email: t.String(),
  }),
  invitedUser: t.String(),
  status: t.String(),
  createdAt: t.String(),
  respondedAt: t.Optional(t.String()),
});

// Create invitation schema
const createInvitationSchema = t.Object({
  teamId: t.String(),
  studentId: t.String(),
  message: t.Optional(t.String()),
});

// Response to invitation schema
const invitationResponseSchema = t.Object({
  response: t.Union([t.Literal("accept"), t.Literal("decline")]),
});

// Create a new Elysia instance for invitation routes
const app = new Elysia({ prefix: "/api/invitations" });

// Apply JWT authentication (handled globally by index.js)

// Common middleware to check for authentication (already done globally)
/* // REMOVED redundant auth check
app.derive(({ user, set }) => {
  if (!user) {
    logger.warn("Unauthorized access attempt in invitation routes");
    set.status = 401;
    throw new UnauthorizedError("Authentication required");
  }
  return { user };
});
*/

// Define routes within the app instance
app
  // Get all invitations for current user
  .get(
    "/",
    {
      detail: {
        tags: ["Invitations"],
        summary: "Get all invitations for the current user",
        security: [{ bearerAuth: [] }],
      },
      response: {
        200: successResponse,
        401: errorResponse,
        500: errorResponse,
      },
    },
    async (context) => {
      try {
        const result = await teamController.getPendingInvitations(context);
        return {
          ...result,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        logger.error("Failed to get invitations", error);
        context.set.status = error.status || 500;
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        };
      }
    }
  )

  // Create new invitation
  .post(
    "/",
    {
      body: createInvitationSchema,
      detail: {
        tags: ["Invitations"],
        summary: "Create a new invitation",
        security: [{ bearerAuth: [] }],
      },
      response: {
        201: successResponse,
        400: errorResponse,
        401: errorResponse,
        500: errorResponse,
      },
    },
    async (context) => {
      try {
        logger.info("Creating new invitation");
        const result = await teamController.inviteUser(context);
        context.set.status = 201;
        return {
          ...result,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        logger.error("Failed to create invitation", error);
        context.set.status = error.status || 500;
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        };
      }
    }
  )

  // Accept invitation
  .put(
    "/:invitationId/accept",
    {
      detail: {
        tags: ["Invitations"],
        summary: "Accept an invitation",
        security: [{ bearerAuth: [] }],
      },
      response: {
        200: successResponse,
        400: errorResponse,
        401: errorResponse,
        500: errorResponse,
      },
    },
    async (context) => {
      try {
        const result = await teamController.acceptInvitation(context);
        return {
          ...result,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        logger.error("Failed to accept invitation", error);
        context.set.status = error.status || 500;
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        };
      }
    }
  )

  // Decline invitation
  .put(
    "/:invitationId/decline",
    {
      detail: {
        tags: ["Invitations"],
        summary: "Decline an invitation",
        security: [{ bearerAuth: [] }],
      },
      response: {
        200: successResponse,
        400: errorResponse,
        401: errorResponse,
        500: errorResponse,
      },
    },
    async (context) => {
      try {
        const result = await teamController.declineInvitation(context);
        return {
          ...result,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        logger.error("Failed to decline invitation", error);
        context.set.status = error.status || 500;
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        };
      }
    }
  )

  // Get invitations for a specific team
  .get(
    "/team/:teamId",
    {
      detail: {
        tags: ["Invitations"],
        summary: "Get all invitations for a specific team",
        security: [{ bearerAuth: [] }],
      },
      response: {
        200: successResponse,
        401: errorResponse,
        403: errorResponse,
        500: errorResponse,
      },
    },
    async (context) => {
      try {
        // This function needs to be implemented in teamController.js
        const result = await teamController.getTeamInvitations(context);
        return {
          ...result,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        logger.error("Failed to get team invitations", error);
        context.set.status = error.status || 500;
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        };
      }
    }
  );

// Export the configured Elysia instance as default
export default app;
