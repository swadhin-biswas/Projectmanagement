import {
  createTeam,
  getMyTeams,
  getPendingInvites,
  getTeamById,
  getTeamMessages,
  inviteStudent,
  leaveTeam,
  respondToInvite,
  sendTeamMessage,
} from "../controllers/studentTeamController.js";
import { jwtAuth } from "../middleware/auth.js";
import { ValidationError } from "../utils/errors.js";
import logger from "../utils/logger.js";

export default function studentTeamRoutes(app) {
  return app.group("/api/student-teams", (app) => {
    // Apply JWT authentication to all routes in this group
    app.use(jwtAuth());

    // Common authorization middleware for student-only routes
    app.derive(({ user, set }) => {
      if (!user || user.role !== "student") {
        set.status = 403;
        throw new ValidationError("Student access only");
      }
      return { user };
    });

    return (
      app
        // Get teams for current student
        .get(
          "/",
          {
            detail: {
              summary: "Get all teams for the current student",
              tags: ["Student", "Teams"],
              security: [{ bearerAuth: [] }],
            },
          },
          async (context) => {
            try {
              const result = await getMyTeams(context);
              return {
                success: true,
                data: result,
                timestamp: new Date().toISOString(),
              };
            } catch (error) {
              logger.error("Failed to get student teams", error);
              context.set.status = error.status || 500;
              return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString(),
              };
            }
          }
        )

        // Create a new team
        .post(
          "/",
          {
            body: {
              type: "object",
              properties: {
                name: { type: "string", minLength: 3, maxLength: 50 },
              },
              required: ["name"],
            },
            detail: {
              summary: "Create a new team",
              tags: ["Student", "Teams"],
              security: [{ bearerAuth: [] }],
            },
          },
          async (context) => {
            try {
              const result = await createTeam(context);
              context.set.status = 201;
              return {
                success: true,
                data: result,
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

        // Get team details by ID
        .get(
          "/:id",
          {
            detail: {
              summary: "Get team details by ID",
              tags: ["Student", "Teams"],
              security: [{ bearerAuth: [] }],
            },
          },
          async (context) => {
            try {
              const result = await getTeamById(context);
              return {
                success: true,
                data: result,
                timestamp: new Date().toISOString(),
              };
            } catch (error) {
              logger.error("Failed to get team details", error);
              context.set.status = error.status || 500;
              return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString(),
              };
            }
          }
        )

        // Invite student to team
        .post(
          "/:id/invite",
          {
            body: {
              type: "object",
              properties: {
                studentId: { type: "string" },
              },
              required: ["studentId"],
            },
            detail: {
              summary: "Invite a student to join the team",
              tags: ["Student", "Teams"],
              security: [{ bearerAuth: [] }],
            },
          },
          async (context) => {
            try {
              const result = await inviteStudent(context);
              return {
                success: true,
                data: result,
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

        // Respond to team invitation
        .post(
          "/:id/respond",
          {
            body: {
              type: "object",
              properties: {
                response: { type: "string", enum: ["accepted", "declined"] },
              },
              required: ["response"],
            },
            detail: {
              summary: "Respond to a team invitation",
              tags: ["Student", "Teams"],
              security: [{ bearerAuth: [] }],
            },
          },
          async (context) => {
            try {
              const result = await respondToInvite(context);
              return {
                success: true,
                data: result,
                timestamp: new Date().toISOString(),
              };
            } catch (error) {
              logger.error("Failed to respond to invitation", error);
              context.set.status = error.status || 500;
              return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString(),
              };
            }
          }
        )

        // Send message in team chat
        .post(
          "/:id/chat",
          {
            body: {
              type: "object",
              properties: {
                content: { type: "string", minLength: 1 },
                attachments: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      url: { type: "string" },
                      type: { type: "string" },
                    },
                  },
                },
              },
              required: ["content"],
            },
            detail: {
              summary: "Send a message in team chat",
              tags: ["Student", "Teams", "Chat"],
              security: [{ bearerAuth: [] }],
              responses: {
                200: { description: "Message sent successfully" },
                400: { description: "Validation error" },
                401: { description: "Unauthorized" },
                403: { description: "Forbidden - not a team member" },
                404: { description: "Team not found" },
              },
            },
          },
          async (context) => {
            const { user } = await authorize(["student"])(context);
            return sendTeamMessage({ ...context, user });
          }
        )

        // Get team chat messages
        .get(
          "/:id/chat",
          {
            query: {
              type: "object",
              properties: {
                limit: { type: "number", default: 50 },
                before: { type: "string", format: "date-time" },
              },
            },
            detail: {
              summary: "Get team chat messages",
              tags: ["Student", "Teams", "Chat"],
              security: [{ bearerAuth: [] }],
              responses: {
                200: { description: "List of chat messages" },
                401: { description: "Unauthorized" },
                403: { description: "Forbidden - not a team member" },
                404: { description: "Team not found" },
              },
            },
          },
          async (context) => {
            const { user } = await authorize(["student"])(context);
            return getTeamMessages({ ...context, user });
          }
        )

        // Leave team
        .delete(
          "/:id/leave",
          {
            detail: {
              summary: "Leave a team",
              tags: ["Student", "Teams"],
              security: [{ bearerAuth: [] }],
              responses: {
                200: { description: "Left team successfully" },
                401: { description: "Unauthorized" },
                403: { description: "Forbidden - not a team member" },
                404: { description: "Team not found" },
              },
            },
          },
          async (context) => {
            const { user } = await authorize(["student"])(context);
            return leaveTeam({ ...context, user });
          }
        )

        // Get pending team invitations
        .get(
          "/invitations",
          {
            detail: {
              summary: "Get pending team invitations",
              tags: ["Student", "Teams"],
              security: [{ bearerAuth: [] }],
            },
          },
          async (context) => {
            try {
              const result = await getPendingInvites(context);
              return {
                success: true,
                data: result,
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
    );
  });
}
