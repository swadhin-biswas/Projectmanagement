import { t } from "elysia";
import * as teamChatController from "../controllers/teamChatController.js";
import * as teamController from "../controllers/teamController.js";
import * as teamInvitationController from "../controllers/teamInvitationController.js";
import logger from "../utils/logger.js";

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
  return app.group("/api/teams", (app) => {
    return (
      app
        // Get all teams for current user
        .get(
          "/",
          {
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
          },
          async (context) => {
            try {
              logger.info("👥 Getting user teams");
              return await teamController.getUserTeams(context);
            } catch (error) {
              logger.error("❌ Error fetching user teams:", error);
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
              400: t.Object({
                success: t.Boolean(),
                error: t.String(),
              }),
              401: t.Object({
                success: t.Boolean(),
                error: t.String(),
              }),
              500: t.Object({
                success: t.Boolean(),
                error: t.String(),
              }),
            },
          },
          async (context) => {
            try {
              logger.info("📝 Team creation requested");
              return await teamController.createTeam(context);
            } catch (error) {
              logger.error("❌ Failed to create team:", error);
              context.set.status = error.status || 500;
              return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString(),
              };
            }
          }
        )

        // Team invitation endpoints
        .post(
          "/:teamId/invite",
          {
            body: inviteSchema,
            detail: {
              tags: ["Teams"],
              summary: "Invite student to team",
              security: [{ bearerAuth: [] }],
            },
            response: {
              201: t.Object({
                success: t.Boolean(),
                message: t.String(),
              }),
              400: t.Object({
                success: t.Boolean(),
                error: t.String(),
              }),
              401: t.Object({
                success: t.Boolean(),
                error: t.String(),
              }),
              404: t.Object({
                success: t.Boolean(),
                error: t.String(),
              }),
            },
          },
          async (context) => {
            try {
              logger.info("📨 Team invitation requested");
              return await teamInvitationController.sendTeamInvitation(context);
            } catch (error) {
              logger.error("❌ Failed to send team invitation:", error);
              context.set.status = error.status || 500;
              return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString(),
              };
            }
          }
        )

        .get(
          "/invitations/pending",
          {
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
                  })
                ),
              }),
              401: t.Object({
                success: t.Boolean(),
                error: t.String(),
              }),
              500: t.Object({
                success: t.Boolean(),
                error: t.String(),
              }),
            },
          },
          async (context) => {
            try {
              return teamInvitationController.getPendingInvitations(context);
            } catch (error) {
              logger.error("❌ Failed to get pending invitations:", error);
              context.set.status = error.status || 500;
              return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString(),
              };
            }
          }
        )

        .post(
          "/:teamId/invitations/:inviteId/respond",
          {
            body: inviteResponseSchema,
            detail: {
              tags: ["Teams"],
              summary: "Respond to team invitation",
              security: [{ bearerAuth: [] }],
            },
            response: {
              200: t.Object({
                success: t.Boolean(),
                message: t.String(),
              }),
              400: t.Object({
                success: t.Boolean(),
                error: t.String(),
              }),
              401: t.Object({
                success: t.Boolean(),
                error: t.String(),
              }),
              404: t.Object({
                success: t.Boolean(),
                error: t.String(),
              }),
            },
          },
          async (context) => {
            try {
              logger.info("✉️ Processing invitation response");
              return teamInvitationController.respondToInvitation(context);
            } catch (error) {
              logger.error("❌ Failed to process invitation response:", error);
              context.set.status = error.status || 500;
              return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString(),
              };
            }
          }
        )

        // Team member management
        .delete(
          "/:teamId/leave",
          {
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
            response: {
              200: t.Object({
                success: t.Boolean(),
                message: t.String(),
              }),
              401: t.Object({
                success: t.Boolean(),
                error: t.String(),
              }),
              403: t.Object({
                success: t.Boolean(),
                error: t.String(),
              }),
              404: t.Object({
                success: t.Boolean(),
                error: t.String(),
              }),
            },
          },
          async (context) => {
            try {
              return teamController.leaveTeam(context);
            } catch (error) {
              logger.error("❌ Failed to leave team:", error);
              context.set.status = error.status || 500;
              return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString(),
              };
            }
          }
        )

        // Team details
        .get(
          "/:teamId",
          {
            response: {
              200: t.Object({
                success: t.Boolean(),
                data: teamResponse,
              }),
              401: t.Object({
                success: t.Boolean(),
                error: t.String(),
              }),
              404: t.Object({
                success: t.Boolean(),
                error: t.String(),
              }),
            },
          },
          async (context) => {
            try {
              return teamController.getTeamDetails(context);
            } catch (error) {
              logger.error("❌ Failed to get team details:", error);
              context.set.status = error.status || 500;
              return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString(),
              };
            }
          }
        )

        .get(
          "/:teamId/members",
          {
            response: {
              200: t.Object({
                success: t.Boolean(),
                data: t.Array(t.Any()),
              }),
              401: t.Object({
                success: t.Boolean(),
                error: t.String(),
              }),
              404: t.Object({
                success: t.Boolean(),
                error: t.String(),
              }),
            },
          },
          async (context) => {
            try {
              return teamController.getTeamMembers(context);
            } catch (error) {
              logger.error("❌ Failed to get team members:", error);
              context.set.status = error.status || 500;
              return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString(),
              };
            }
          }
        )

        // Team chat functionality
        .group("/:teamId/chat", (app) => {
          return app
            .get(
              "/",
              {
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
                  401: t.Object({
                    success: t.Boolean(),
                    error: t.String(),
                  }),
                  404: t.Object({
                    success: t.Boolean(),
                    error: t.String(),
                  }),
                },
              },
              async (context) => {
                try {
                  return teamChatController.getTeamChatMessages(context);
                } catch (error) {
                  logger.error("❌ Failed to get team chat messages:", error);
                  context.set.status = error.status || 500;
                  return {
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString(),
                  };
                }
              }
            )

            .post(
              "/",
              {
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
              },
              async (context) => {
                return teamChatController.sendTeamMessage(context);
              }
            )

            .get(
              "/unread",
              {
                response: {
                  200: t.Object({
                    success: t.Boolean(),
                    data: t.Object({
                      unreadCount: t.Number(),
                    }),
                  }),
                },
              },
              async (context) => {
                return teamChatController.getUnreadCount(context);
              }
            )

            .post(
              "/mark-read",
              {
                response: {
                  200: t.Object({
                    success: t.Boolean(),
                    message: t.String(),
                  }),
                },
              },
              async (context) => {
                return teamChatController.markMessagesAsRead(context);
              }
            )

            .get(
              "/announcements",
              {
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
              },
              async (context) => {
                return teamChatController.getAnnouncements(context);
              }
            );
        })
    );
  });
}
