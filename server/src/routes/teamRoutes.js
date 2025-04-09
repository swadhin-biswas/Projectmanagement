import { t } from "elysia";
import * as teamController from "../controllers/teamController.js";
import { jwtAuth } from "../middleware/auth.js";
import logger from "../utils/logger.js";

// Team schemas
const teamResponse = t.Object({
  _id: t.String(),
  name: t.String(),
  teamId: t.String(),
  members: t.Array(
    t.Object({
      user: t.Object({
        _id: t.String(),
        fullName: t.String(),
        email: t.String(),
        profilePicture: t.Optional(t.String()),
      }),
      role: t.String(),
      joinedAt: t.String(),
      status: t.String(),
    })
  ),
  maxMembers: t.Number(),
  description: t.Optional(t.String()),
  status: t.String(),
});

// Team creation schema
const createTeamSchema = t.Object({
  name: t.String(),
  description: t.Optional(t.String()),
});

// Team invitation schema
const inviteSchema = t.Object({
  teamId: t.String(),
  studentId: t.String(),
  message: t.Optional(t.String()),
});

// Invitation response schema
const inviteResponseSchema = t.Object({
  response: t.Union([t.Literal("accept"), t.Literal("decline")]),
});

// Success response schema
const successResponse = t.Object({
  success: t.Boolean(),
  message: t.String(),
  data: t.Optional(t.Any()),
  timestamp: t.Optional(t.String()),
});

// Error response schema
const errorResponse = t.Object({
  success: t.Boolean(),
  error: t.String(),
  timestamp: t.Optional(t.String()),
});

// Export as a function that takes app as parameter
export default function teamRoutes(app) {
  return app.group("/api/teams", (app) => {
    // Apply JWT authentication to all routes in this group
    app.use(jwtAuth());

    return (
      app
        // Get user's teams
        .get(
          "/my-teams",
          {
            detail: {
              tags: ["Teams"],
              summary: "Get teams the user is a member of",
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
              const result = await teamController.getMyTeams(context);
              return {
                ...result,
                timestamp: new Date().toISOString(),
              };
            } catch (error) {
              logger.error("Failed to get user teams", error);
              context.set.status = error.status || 500;
              return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString(),
              };
            }
          }
        )

        // Create team
        .post(
          "/create",
          {
            body: createTeamSchema,
            detail: {
              tags: ["Teams"],
              summary: "Create a new team",
              security: [{ bearerAuth: [] }],
            },
            response: {
              201: successResponse,
              400: errorResponse,
            },
          },
          async (context) => {
            try {
              logger.info("Creating new team");
              const result = await teamController.createTeam(context);
              context.set.status = 201;
              return {
                ...result,
                timestamp: new Date().toISOString(),
              };
            } catch (error) {
              logger.error("Failed to create team", error);
              context.set.status = error.status || 500;
              return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString(),
              };
            }
          }
        )

        // Get team by ID
        .get(
          "/:teamId",
          {
            detail: {
              tags: ["Teams"],
              summary: "Get team by ID",
              security: [{ bearerAuth: [] }],
            },
            response: {
              200: successResponse,
              404: errorResponse,
            },
          },
          async (context) => {
            try {
              const result = await teamController.getTeamById(context);
              return {
                ...result,
                timestamp: new Date().toISOString(),
              };
            } catch (error) {
              logger.error("Failed to get team", error);
              context.set.status = error.status || 500;
              return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString(),
              };
            }
          }
        )

        // Update team
        .put(
          "/:teamId",
          {
            body: t.Object({
              name: t.Optional(t.String()),
              description: t.Optional(t.String()),
            }),
            detail: {
              tags: ["Teams"],
              summary: "Update team details",
              security: [{ bearerAuth: [] }],
            },
            response: {
              200: successResponse,
              404: errorResponse,
            },
          },
          async (context) => {
            try {
              const result = await teamController.updateTeam(context);
              return {
                ...result,
                timestamp: new Date().toISOString(),
              };
            } catch (error) {
              logger.error("Failed to update team", error);
              context.set.status = error.status || 500;
              return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString(),
              };
            }
          }
        )

        // Delete team
        .delete(
          "/:teamId",
          {
            detail: {
              tags: ["Teams"],
              summary: "Delete a team",
              security: [{ bearerAuth: [] }],
            },
            response: {
              200: successResponse,
              404: errorResponse,
            },
          },
          async (context) => {
            try {
              const result = await teamController.deleteTeam(context);
              return {
                ...result,
                timestamp: new Date().toISOString(),
              };
            } catch (error) {
              logger.error("Failed to delete team", error);
              context.set.status = error.status || 500;
              return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString(),
              };
            }
          }
        )

        // Team invitations
        .post(
          "/invite",
          {
            body: inviteSchema,
            detail: {
              tags: ["Teams"],
              summary: "Invite a user to a team",
              security: [{ bearerAuth: [] }],
            },
            response: {
              201: successResponse,
              400: errorResponse,
            },
          },
          async (context) => {
            try {
              logger.info("Sending team invitation");
              const result = await teamController.inviteUser(context);
              context.set.status = 201;
              return {
                ...result,
                timestamp: new Date().toISOString(),
              };
            } catch (error) {
              logger.error("Failed to send invitation", error);
              context.set.status = error.status || 500;
              return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString(),
              };
            }
          }
        )

        // Get pending invitations
        .get(
          "/invitations/pending",
          {
            detail: {
              tags: ["Teams"],
              summary: "Get pending team invitations",
              security: [{ bearerAuth: [] }],
            },
            response: {
              200: successResponse,
              401: errorResponse,
            },
          },
          async (context) => {
            try {
              const result = await teamController.getPendingInvitations(
                context
              );
              return {
                ...result,
                timestamp: new Date().toISOString(),
              };
            } catch (error) {
              logger.error("Failed to get pending invitations", error);
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
          "/invitations/:invitationId/accept",
          {
            detail: {
              tags: ["Teams"],
              summary: "Accept a team invitation",
              security: [{ bearerAuth: [] }],
            },
            response: {
              200: successResponse,
              400: errorResponse,
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
          "/invitations/:invitationId/decline",
          {
            detail: {
              tags: ["Teams"],
              summary: "Decline a team invitation",
              security: [{ bearerAuth: [] }],
            },
            response: {
              200: successResponse,
              400: errorResponse,
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
    );
  });
}
