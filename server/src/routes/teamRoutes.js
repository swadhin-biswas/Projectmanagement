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

const createTeamSchema = t.Object({
  name: t.String(),
  description: t.Optional(t.String()),
});

const inviteSchema = t.Object({
  teamId: t.String(),
  studentId: t.String(),
  message: t.Optional(t.String()),
});

const inviteResponseSchema = t.Object({
  response: t.Union([t.Literal("accept"), t.Literal("decline")]),
});

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

// Export team routes as a plugin function
export default function teamRoutes(app) {
  // Debug jwtAuth to ensure it’s loaded correctly
  console.log("jwtAuth:", jwtAuth);

  return app.group("/api/teams", (app) =>
    app
      .use(jwtAuth()) // Apply JWT middleware to the group
      .get(
        "/my-teams",
        async ({ set, user, ...context }) => {
          try {
            // Pass user from jwtAuth to the controller
            const result = await teamController.getMyTeams({ ...context, user });
            return { ...result, timestamp: new Date().toISOString() };
          } catch (error) {
            logger.error("Failed to get user teams", error);
            set.status = error.status || 500;
            return {
              success: false,
              error: error.message,
              timestamp: new Date().toISOString(),
            };
          }
        },
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
        }
      )
      .post(
        "/create",
        async ({ set, user, ...context }) => {
          try {
            logger.info("Creating new team");
            const result = await teamController.createTeam({ ...context, user });
            set.status = 201;
            return { ...result, timestamp: new Date().toISOString() };
          } catch (error) {
            logger.error("Failed to create team", error);
            set.status = error.status || 500;
            return {
              success: false,
              error: error.message,
              timestamp: new Date().toISOString(),
            };
          }
        },
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
        }
      )
      .get(
        "/:teamId",
        async ({ set, user, ...context }) => {
          try {
            const result = await teamController.getTeamById({ ...context, user });
            return { ...result, timestamp: new Date().toISOString() };
          } catch (error) {
            logger.error("Failed to get team", error);
            set.status = error.status || 500;
            return {
              success: false,
              error: error.message,
              timestamp: new Date().toISOString(),
            };
          }
        },
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
        }
      )
      .put(
        "/:teamId",
        async ({ set, user, ...context }) => {
          try {
            const result = await teamController.updateTeam({ ...context, user });
            return { ...result, timestamp: new Date().toISOString() };
          } catch (error) {
            logger.error("Failed to update team", error);
            set.status = error.status || 500;
            return {
              success: false,
              error: error.message,
              timestamp: new Date().toISOString(),
            };
          }
        },
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
        }
      )
      .delete(
        "/:teamId",
        async ({ set, user, ...context }) => {
          try {
            const result = await teamController.deleteTeam({ ...context, user });
            return { ...result, timestamp: new Date().toISOString() };
          } catch (error) {
            logger.error("Failed to delete team", error);
            set.status = error.status || 500;
            return {
              success: false,
              error: error.message,
              timestamp: new Date().toISOString(),
            };
          }
        },
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
        }
      )
      .post(
        "/invite",
        async ({ set, user, ...context }) => {
          try {
            logger.info("Sending team invitation");
            const result = await teamController.inviteUser({ ...context, user });
            set.status = 201;
            return { ...result, timestamp: new Date().toISOString() };
          } catch (error) {
            logger.error("Failed to send invitation", error);
            set.status = error.status || 500;
            return {
              success: false,
              error: error.message,
              timestamp: new Date().toISOString(),
            };
          }
        },
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
        }
      )
      .get(
        "/invitations/pending",
        async ({ set, user, ...context }) => {
          try {
            const result = await teamController.getPendingInvitations({
              ...context,
              user,
            });
            return { ...result, timestamp: new Date().toISOString() };
          } catch (error) {
            logger.error("Failed to get pending invitations", error);
            set.status = error.status || 500;
            return {
              success: false,
              error: error.message,
              timestamp: new Date().toISOString(),
            };
          }
        },
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
        }
      )
      .put(
        "/invitations/:invitationId/accept",
        async ({ set, user, ...context }) => {
          try {
            const result = await teamController.acceptInvitation({
              ...context,
              user,
            });
            return { ...result, timestamp: new Date().toISOString() };
          } catch (error) {
            logger.error("Failed to accept invitation", error);
            set.status = error.status || 500;
            return {
              success: false,
              error: error.message,
              timestamp: new Date().toISOString(),
            };
          }
        },
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
        }
      )
      .put(
        "/invitations/:invitationId/decline",
        async ({ set, user, ...context }) => {
          try {
            const result = await teamController.declineInvitation({
              ...context,
              user,
            });
            return { ...result, timestamp: new Date().toISOString() };
          } catch (error) {
            logger.error("Failed to decline invitation", error);
            set.status = error.status || 500;
            return {
              success: false,
              error: error.message,
              timestamp: new Date().toISOString(),
            };
          }
        },
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
        }
      )
  );
}