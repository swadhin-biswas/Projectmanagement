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
import { ValidationError } from "../utils/errors.js";
import logger from "../utils/logger.js";

// Utility function for consistent response formatting
const formatResponse = (success, data, message, status) => ({
  success,
  data: data ?? (success ? {} : null), // Ensure data is never undefined
  message: message || (success ? "Operation successful" : "Operation failed"),
  timestamp: new Date().toISOString(),
  ...(status && { status }),
});

export const teamRoutes = (app) => {
  // Student team routes under /api/student/team
  app.group("/api/student/team", (app) => {
    // Middleware to restrict access to students
    app.derive(({ user, set }) => {
      if (!user || user.role !== "student") {
        set.status = 403;
        throw new ValidationError("Student access only");
      }
      return { user };
    });

    // Create a new team
    app.post(
      "/create",
      {
        body: {
          type: "object",
          properties: {
            name: { type: "string", minLength: 3, maxLength: 50 },
            description: { type: "string", maxLength: 500 },
          },
          required: ["name"],
        },
        detail: {
          summary: "Create a new team",
          tags: ["Student", "Teams"],
        },
      },
      async (context) => {
        try {
          const result = await createTeam(context);
          context.set.status = 201;
          return formatResponse(true, result.data, result.message, 201);
        } catch (error) {
          logger.error("Failed to create team", error);
          context.set.status = error.status || 500;
          return formatResponse(false, null, error.message, error.status || 500);
        }
      }
    );
  });

  // Legacy team routes under /api/teams
  app.group("/api/teams", (app) => {
    // Middleware to restrict access to students
    app.derive(({ user, set }) => {
      if (!user || user.role !== "student") {
        set.status = 403;
        throw new ValidationError("Student access only");
      }
      return { user };
    });

    // Get teams for current student
    app.get(
      "/",
      {
        detail: {
          summary: "Get all teams for the current student",
          tags: ["Student", "Teams"],
        },
      },
      async (context) => {
        try {
          const result = await getMyTeams(context);
          return formatResponse(true, result.data, result.message);
        } catch (error) {
          logger.error("Failed to get student teams", error);
          context.set.status = error.status || 500;
          return formatResponse(false, null, error.message, error.status || 500);
        }
      }
    );

    // Create a new team (legacy route)
    app.post(
      "/",
      {
        body: {
          type: "object",
          properties: {
            name: { type: "string", minLength: 3, maxLength: 50 },
            description: { type: "string", maxLength: 500 },
          },
          required: ["name"],
        },
        detail: {
          summary: "Create a new team",
          tags: ["Student", "Teams"],
        },
      },
      async (context) => {
        try {
          const result = await createTeam(context);
          context.set.status = 201;
          return formatResponse(true, result.data, result.message, 201);
        } catch (error) {
          logger.error("Failed to create team", error);
          context.set.status = error.status || 500;
          return formatResponse(false, null, error.message, error.status || 500);
        }
      }
    );

    // Get team details by ID
    app.get(
      "/:id",
      {
        detail: {
          summary: "Get team details by ID",
          tags: ["Student", "Teams"],
        },
      },
      async (context) => {
        try {
          const result = await getTeamById(context);
          return formatResponse(true, result.data, result.message);
        } catch (error) {
          logger.error("Failed to get team details", error);
          context.set.status = error.status || 500;
          return formatResponse(false, null, error.message, error.status || 500);
        }
      }
    );

    // Invite student to team
    app.post(
      "/:id/invite",
      {
        body: {
          type: "object",
          properties: {
            studentId: { type: "string" },
            message: { type: "string", maxLength: 200 },
          },
          required: ["studentId"],
        },
        detail: {
          summary: "Invite a student to join the team",
          tags: ["Student", "Teams"],
        },
      },
      async (context) => {
        try {
          const result = await inviteStudent(context);
          return formatResponse(true, result.data, result.message);
        } catch (error) {
          logger.error("Failed to send invitation", error);
          context.set.status = error.status || 500;
          return formatResponse(false, null, error.message, error.status || 500);
        }
      }
    );

    // Respond to team invitation
    app.post(
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
        },
      },
      async (context) => {
        try {
          const result = await respondToInvite(context);
          return formatResponse(true, result.data, result.message);
        } catch (error) {
          logger.error("Failed to respond to invitation", error);
          context.set.status = error.status || 500;
          return formatResponse(false, null, error.message, error.status || 500);
        }
      }
    );

    // Send message in team chat
    app.post(
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
        try {
          const result = await sendTeamMessage(context);
          return formatResponse(true, result.data, result.message);
        } catch (error) {
          logger.error("Failed to send team message", error);
          context.set.status = error.status || 500;
          return formatResponse(false, null, error.message, error.status || 500);
        }
      }
    );

    // Get team chat messages
    app.get(
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
          responses: {
            200: { description: "List of chat messages" },
            401: { description: "Unauthorized" },
            403: { description: "Forbidden - not a team member" },
            404: { description: "Team not found" },
          },
        },
      },
      async (context) => {
        try {
          const result = await getTeamMessages(context);
          return formatResponse(true, result.data, result.message);
        } catch (error) {
          logger.error("Failed to get team messages", error);
          context.set.status = error.status || 500;
          return formatResponse(false, null, error.message, error.status || 500);
        }
      }
    );

    // Leave team
    app.delete(
      "/:id/leave",
      {
        detail: {
          summary: "Leave a team",
          tags: ["Student", "Teams"],
          responses: {
            200: { description: "Left team successfully" },
            401: { description: "Unauthorized" },
            403: { description: "Forbidden - not a team member" },
            404: { description: "Team not found" },
          },
        },
      },
      async (context) => {
        try {
          const result = await leaveTeam(context);
          return formatResponse(true, result.data, result.message);
        } catch (error) {
          logger.error("Failed to leave team", error);
          context.set.status = error.status || 500;
          return formatResponse(false, null, error.message, error.status || 500);
        }
      }
    );

    // Get pending team invitations
    app.get(
      "/invitations",
      {
        detail: {
          summary: "Get pending team invitations",
          tags: ["Student", "Teams"],
        },
      },
      async (context) => {
        try {
          const result = await getPendingInvites(context);
          return formatResponse(true, result.data, result.message);
        } catch (error) {
          logger.error("Failed to get pending invitations", error);
          context.set.status = error.status || 500;
          return formatResponse(false, null, error.message, error.status || 500);
        }
      }
    );
  });
};