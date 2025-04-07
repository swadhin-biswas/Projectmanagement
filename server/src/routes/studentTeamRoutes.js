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
import { authorize } from "../middleware/auth.js";

export const studentTeamRoutes = (app) => {
  return (
    app
      // Get teams for current student
      .get(
        "/teams",
        {
          detail: {
            summary: "Get all teams for the current student",
            tags: ["Student", "Teams"],
            security: [{ bearerAuth: [] }],
            responses: {
              200: { description: "List of student's teams" },
              401: { description: "Unauthorized" },
              404: { description: "Student profile not found" },
            },
          },
        },
        async (context) => {
          const { user } = await authorize(["student"])(context);
          return getMyTeams({ ...context, user });
        }
      )

      // Create a new team
      .post(
        "/teams",
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
            responses: {
              201: { description: "Team created successfully" },
              400: { description: "Validation error" },
              401: { description: "Unauthorized" },
              404: { description: "Student profile not found" },
            },
          },
        },
        async (context) => {
          const { user } = await authorize(["student"])(context);
          return createTeam({ ...context, user });
        }
      )

      // Get team details by ID
      .get(
        "/teams/:id",
        {
          detail: {
            summary: "Get team details by ID",
            tags: ["Student", "Teams"],
            security: [{ bearerAuth: [] }],
            responses: {
              200: { description: "Team details" },
              401: { description: "Unauthorized" },
              403: { description: "Forbidden - not a team member" },
              404: { description: "Team not found" },
            },
          },
        },
        async (context) => {
          const { user } = await authorize(["student"])(context);
          return getTeamById({ ...context, user });
        }
      )

      // Invite student to team
      .post(
        "/teams/:id/invite",
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
            responses: {
              200: { description: "Invitation sent successfully" },
              400: { description: "Validation error or team is full" },
              401: { description: "Unauthorized" },
              403: { description: "Forbidden - not a team member" },
              404: { description: "Team or student not found" },
            },
          },
        },
        async (context) => {
          const { user } = await authorize(["student"])(context);
          return inviteStudent({ ...context, user });
        }
      )

      // Respond to team invitation
      .post(
        "/teams/:id/respond",
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
            responses: {
              200: { description: "Response processed successfully" },
              400: { description: "Validation error" },
              401: { description: "Unauthorized" },
              404: { description: "Team or invitation not found" },
            },
          },
        },
        async (context) => {
          const { user } = await authorize(["student"])(context);
          return respondToInvite({ ...context, user });
        }
      )

      // Send message in team chat
      .post(
        "/teams/:id/chat",
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
        "/teams/:id/chat",
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
        "/teams/:id/leave",
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
            responses: {
              200: { description: "List of pending invitations" },
              401: { description: "Unauthorized" },
              404: { description: "Student profile not found" },
            },
          },
        },
        async (context) => {
          const { user } = await authorize(["student"])(context);
          return getPendingInvites({ ...context, user });
        }
      )
  );
};
