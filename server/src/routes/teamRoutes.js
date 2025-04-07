import { t } from "elysia";
import * as teamChatController from "../controllers/teamChatController.js";
import * as teamController from "../controllers/teamController.js";
import * as teamInvitationController from "../controllers/teamInvitationController.js";
import { authorize } from "../middleware/auth.js";
import { logger } from "../utils/logger.js";

// Response schemas
const teamResponse = t.Object({
  _id: t.String(),
  name: t.String(),
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
    })
  ),
  maxMembers: t.Number(),
  invites: t.Array(
    t.Object({
      student: t.String(),
      status: t.String(),
      expiresAt: t.String(),
    })
  ),
});

const inviteSchema = t.Object({
  studentId: t.String(),
  message: t.Optional(t.String()),
});

const inviteResponseSchema = t.Object({
  response: t.Union([t.Literal("accept"), t.Literal("decline")]),
});

export default function teamRoutes(app) {
  return app.group("/teams", (app) => {
    return app
      // Get all teams for current user
      .get("/", {
        detail: {
          summary: "Get all teams for the current user",
          tags: ["Teams"],
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "List of user's teams" },
            401: { description: "Unauthorized" },
            404: { description: "Profile not found" },
          },
        },
      }, async (context) => {
        const { user } = await authorize(["student", "supervisor"])(context);
        return teamController.getUserTeams({ ...context, user });
      })

      // Create a new team
      .post("/", {
        body: t.Object({
          name: t.String({ minLength: 2, maxLength: 50 }),
          description: t.Optional(t.String()),
          maxMembers: t.Optional(t.Number({ minimum: 2, maximum: 6 })),
        }),
        response: {
          201: t.Object({
            success: t.Boolean(),
            data: t.Object({
              _id: t.String(),
              name: t.String(),
              members: t.Array(t.Any()),
            }),
          }),
        },
      }, async (context) => {
        try {
          logger.info("📝 Team creation requested");
          const { user } = await authorize(["student"])(context);
          return teamController.createTeam({ ...context, user });
        } catch (error) {
          logger.error("❌ Failed to create team:", error);
          throw error;
        }
      })

      // Team invitation endpoints
      .post("/:teamId/invite", {
        body: inviteSchema,
        detail: {
          tags: ["Teams"],
          summary: "Invite student to team",
          security: [{ bearerAuth: [] }],
        },
      }, async (context) => {
        try {
          logger.info("📨 Team invitation requested");
          const { user } = await authorize(["student"])(context);
          return teamInvitationController.sendTeamInvitation({
            ...context,
            user,
          });
        } catch (error) {
          logger.error("❌ Failed to send team invitation:", error);
          throw error;
        }
      })

      .get("/invitations/pending", {
        response: {
          200: t.Object({
            success: t.Boolean(),
            data: t.Array(
              t.Object({
                id: t.String(),
                team: t.Object({
                  id: t.String(),
                  name: t.String(),
                  currentMembers: t.Number(),
                  maxMembers: t.Number(),
                }),
                invitedBy: t.Object({
                  id: t.String(),
                  name: t.String(),
                }),
                message: t.Optional(t.String()),
                expiresAt: t.String(),
              }),
            ),
          }),
        },
      }, async (context) => {
        const { user } = await authorize(["student"])(context);
        return teamInvitationController.getPendingInvitations({ ...context, user });
      })

      .post("/:teamId/invitations/:inviteId/respond", {
        body: inviteResponseSchema,
        detail: {
          tags: ["Teams"],
          summary: "Respond to team invitation",
          security: [{ bearerAuth: [] }],
        },
      }, async (context) => {
        try {
          logger.info("✉️ Processing invitation response");
          const { user } = await authorize(["student"])(context);
          return teamInvitationController.respondToInvitation({
            ...context,
            user,
          });
        } catch (error) {
          logger.error("❌ Failed to process invitation response:", error);
          throw error;
        }
      })

      // Team member management
      .delete("/:teamId/leave", {
        detail: {
          summary: "Leave a team",
          tags: ["Teams"],
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "Left team successfully" },
            401: { description: "Unauthorized" },
            403: { description: "Forbidden - not a team member" },
            404: { description: "Team not found" },
          },
        },
      }, async (context) => {
        const { user } = await authorize(["student"])(context);
        return teamController.leaveTeam({ ...context, user });
      })

      // Team details
      .get("/:teamId", {
        response: {
          200: t.Object({
            success: t.Boolean(),
            data: teamResponse,
          }),
        },
      }, async (context) => {
        const { user } = await authorize(["student", "supervisor"])(context);
        return teamController.getTeamDetails({ ...context, user });
      })

      .get("/:teamId/members", {
        response: {
          200: t.Object({
            success: t.Boolean(),
            data: t.Array(t.Any()),
          }),
        },
      }, async (context) => {
        const { user } = await authorize(["student", "supervisor"])(context);
        return teamController.getTeamMembers({ ...context, user });
      })

      // Team chat functionality
      .group("/:teamId/chat", (app) => {
        return app
          .get("/", {
            query: t.Object({
              limit: t.Optional(t.Number()),
              before: t.Optional(t.String()),
            }),
            response: {
              200: t.Object({
                success: t.Boolean(),
                data: t.Array(
                  t.Object({
                    _id: t.String(),
                    sender: t.Object({
                      _id: t.String(),
                      fullName: t.String(),
                    }),
                    content: t.String(),
                    timestamp: t.String(),
                    readBy: t.Array(t.String()),
                    isAnnouncement: t.Boolean(),
                  })
                ),
              }),
            },
          }, async (context) => {
            await authorize(["student", "supervisor"])(context);
            return teamChatController.getTeamChatMessages(context);
          })

          .post("/", {
            body: t.Object({
              content: t.String(),
              isAnnouncement: t.Optional(t.Boolean()),
              attachments: t.Optional(
                t.Array(
                  t.Object({
                    url: t.String(),
                    type: t.String(),
                  })
                )
              ),
            }),
          }, async (context) => {
            await authorize(["student", "supervisor"])(context);
            return teamChatController.sendTeamMessage(context);
          })

          .get("/unread", {
            response: {
              200: t.Object({
                success: t.Boolean(),
                data: t.Object({
                  unreadCount: t.Number(),
                }),
              }),
            },
          }, async (context) => {
            await authorize(["student", "supervisor"])(context);
            return teamChatController.getUnreadCount(context);
          })

          .post("/mark-read", {
            response: {
              200: t.Object({
                success: t.Boolean(),
                message: t.String(),
              }),
            },
          }, async (context) => {
            await authorize(["student", "supervisor"])(context);
            return teamChatController.markMessagesAsRead(context);
          })

          .get("/announcements", {
            response: {
              200: t.Object({
                success: t.Boolean(),
                data: t.Array(
                  t.Object({
                    _id: t.String(),
                    content: t.String(),
                    timestamp: t.String(),
                    sender: t.Object({
                      _id: t.String(),
                      fullName: t.String(),
                    }),
                  })
                ),
              }),
            },
          }, async (context) => {
            await authorize(["student", "supervisor"])(context);
            return teamChatController.getAnnouncements(context);
          });
      });
  });
}
