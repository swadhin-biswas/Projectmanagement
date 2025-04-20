import { t } from "elysia";
import * as studentController from "../controllers/studentController.js";
import * as teamController from "../controllers/teamController.js";
import {
  createTeamSchema,
  inviteToTeamSchema,
  removeMemberSchema,
  respondToInvitationSchema,
} from "../schemas/teamSchemas.js";
import logger from "../utils/logger.js";
import { routeProtection } from "../utils/routeAuth.js";

// Common response schemas
const successResponse = t.Object({
  success: t.Boolean(),
  message: t.String(),
  data: t.Optional(t.Any()),
});

const errorResponse = t.Object({
  success: t.Boolean(),
  error: t.String(),
  timestamp: t.Optional(t.String()),
});

export default function studentRoutes(app) {
  const teamCreateSchema = t.Object({
    name: t.String({ minLength: 3 }),
    description: t.Optional(t.String()),
    id: t.Optional(t.String()),
    members: t.Optional(t.Array(t.String())),
  });
  const teamInviteSchema = t.Object({
    email: t.String({ format: "email" }),
    teamId: t.Optional(t.String()),
  });

  // Remove the redundant "/student" path here since the route is already mounted at /api/student in index.js
  return routeProtection.studentOnly(
    app.group("", (app) => {
      // Profile routes
      app.get(
        "/profile",
        {
          response: {
            200: t.Object({
              success: t.Boolean(),
              data: t.Object({
                student: t.Object({
                  _id: t.String(),
                  fullName: t.String(),
                  email: t.String(),
                  department: t.String(),
                  studentId: t.String(),
                }),
                currentSession: t.Optional(
                  t.Object({
                    _id: t.String(),
                    name: t.String(),
                    startDate: t.String(),
                    endDate: t.String(),
                    deadlines: t.Array(
                      t.Object({
                        name: t.String(),
                        date: t.String(),
                        type: t.String(),
                      })
                    ),
                  })
                ),
              }),
            }),
            404: errorResponse,
          },
        },
        async ({ user, set }) => {
          try {
            logger.debug("Getting student profile for user:", {
              userId: user.id,
              userRole: user.role,
              userEmail: user.email,
            });

            const result = await studentController.getStudentProfile({ user });
            return result;
          } catch (error) {
            logger.error("Student profile error:", error);
            set.status = error.status || 500;
            return {
              success: false,
              error: error.message,
            };
          }
        }
      );

      // Deadlines routes
      app.get(
        "/deadlines",
        {
          response: {
            200: t.Object({
              success: t.Boolean(),
              deadlines: t.Array(
                t.Object({
                  _id: t.String(),
                  name: t.String(),
                  date: t.String(),
                  type: t.String(),
                  description: t.Optional(t.String()),
                  isPassed: t.Boolean(),
                  daysRemaining: t.Number(),
                })
              ),
            }),
            404: errorResponse,
            500: errorResponse,
          },
        },
        async ({ user, set }) => {
          try {
            const result = await studentController.getStudentDeadlines(user.id);
            return result;
          } catch (error) {
            set.status = error.status || 500;
            return {
              success: false,
              error: error.message,
            };
          }
        }
      );

      // Submissions routes
      app.post(
        "/submit-report",
        {
          body: t.Object({
            title: t.String({ minLength: 3 }),
            content: t.String({ minLength: 100 }),
            attachmentUrl: t.Optional(t.String()),
            deadlineId: t.String(),
          }),
          response: {
            201: successResponse,
            400: errorResponse,
            404: errorResponse,
            500: errorResponse,
          },
        },
        async ({ body, user, set }) => {
          try {
            const result = await studentController.submitReport(user.id, body);
            set.status = 201;
            return result;
          } catch (error) {
            set.status = error.status || 500;
            return {
              success: false,
              error: error.message,
            };
          }
        }
      );

      // Messages routes
      app.get(
        "/messages",
        {
          response: {
            200: t.Array(
              t.Object({
                _id: t.String(),
                from: t.Object({
                  _id: t.String(),
                  fullName: t.String(),
                  role: t.String(),
                }),
                content: t.String(),
                createdAt: t.String(),
                isRead: t.Boolean(),
              })
            ),
            500: errorResponse,
          },
        },
        async ({ user, set }) => {
          try {
            const result = await studentController.getStudentMessages(user.id);
            return result;
          } catch (error) {
            set.status = error.status || 500;
            return {
              success: false,
              error: error.message,
            };
          }
        }
      );

      app.put(
        "/messages/:messageId/read",
        {
          params: t.Object({
            messageId: t.String(),
          }),
          response: {
            200: successResponse,
            404: errorResponse,
            500: errorResponse,
          },
        },
        async ({ params, user, set }) => {
          try {
            const result = await studentController.markMessageAsRead(
              user.id,
              params.messageId
            );
            return result;
          } catch (error) {
            set.status = error.status || 500;
            return {
              success: false,
              error: error.message,
            };
          }
        }
      );

      // Results routes
      app.get(
        "/results",
        {
          response: {
            200: t.Object({
              success: t.Boolean(),
              data: t.Array(
                t.Object({
                  id: t.String(),
                  category: t.String(),
                  score: t.Number(),
                  feedback: t.Optional(t.String()),
                  date: t.String(),
                  project: t.Optional(
                    t.Object({
                      id: t.String(),
                      name: t.String(),
                    })
                  ),
                  supervisor: t.Optional(
                    t.Object({
                      name: t.String(),
                    })
                  ),
                })
              ),
            }),
            404: errorResponse,
            500: errorResponse,
          },
        },
        async ({ user, set }) => {
          try {
            const result = await studentController.getStudentResults({ user });
            return result;
          } catch (error) {
            set.status = error.status || 500;
            return {
              success: false,
              error: error.message,
            };
          }
        }
      );

      app.get(
        "/results/:resultId",
        {
          response: {
            200: t.Object({
              success: t.Boolean(),
              data: t.Object({
                id: t.String(),
                category: t.String(),
                score: t.Number(),
                feedback: t.Optional(t.String()),
                date: t.String(),
                project: t.Optional(
                  t.Object({
                    id: t.String(),
                    name: t.String(),
                    type: t.String(),
                    submissionDate: t.String(),
                  })
                ),
                supervisor: t.Optional(
                  t.Object({
                    name: t.String(),
                    feedback: t.Optional(t.String()),
                  })
                ),
              }),
            }),
            404: errorResponse,
            500: errorResponse,
          },
        },
        async ({ params, user, set }) => {
          try {
            const result = await studentController.getResultDetail({
              params,
              user,
            });
            return result;
          } catch (error) {
            set.status = error.status || 500;
            return {
              success: false,
              error: error.message,
            };
          }
        }
      );

      app.group("/team", (app) => {
        return (
          app
            .get("/", async ({ user, set }) => {
              try {
                const result = await teamController.getUserTeam({ user });
                return {
                  ...result,
                  timestamp: new Date().toISOString(),
                };
              } catch (error) {
                logger.error("Failed to get user team", error);
                set.status = error.status || 500;
                return {
                  success: false,
                  error: error.message,
                  timestamp: new Date().toISOString(),
                };
              }
            })
            // Add GET handler for /create path to avoid 404 errors
            .get("/create", async ({ set }) => {
              logger.info("Received GET request to team creation endpoint");
              set.status = 405; // Method Not Allowed
              return {
                success: false,
                error:
                  "Method not allowed. This endpoint requires a POST request.",
                timestamp: new Date().toISOString(),
              };
            })
            .post(
              "/create",teamController.createTeam,
              {
                body: createTeamSchema.body,
              },
              async ({ body, user, set }) => {
                try {
                  const result = await teamController.createTeam({
                    body,
                    user,
                  });
                  logger.debug("Team created successfully", {
                    teamId: result.data._id,
                    teamName: result.data.name,
                    members: result.data.members,
                  });
                  set.status = 201;
                  return {
                    ...result,
                    timestamp: new Date().toISOString(),
                  };
                } catch (error) {
                  logger.error("Failed to create team", error);
                  set.status = error.status || 500;
                  return {
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString(),
                  };
                }
              }
            )
            .post(
              "/invite",teamController.inviteUser,
              {
                body: inviteToTeamSchema.body,
              },
              async ({ body, user, set }) => {
                try {
                  const result = await teamController.inviteUser({
                    body,
                    user,
                  });
                  set.status = 201;
                  return {
                    ...result,
                    timestamp: new Date().toISOString(),
                  };
                } catch (error) {
                  logger.error("Failed to send invitation", error);
                  set.status = error.status || 500;
                  return {
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString(),
                  };
                }
              }
            )
            .get("/invitations", async ({ user, set }) => {
              try {
                const result = await teamController.getPendingInvitations({
                  user,
                });
                return {
                  ...result,
                  timestamp: new Date().toISOString(),
                };
              } catch (error) {
                logger.error("Failed to get invitations", error);
                set.status = error.status || 500;
                return {
                  success: false,
                  error: error.message,
                  timestamp: new Date().toISOString(),
                };
              }
            })
            .post(
              "/respond-to-invitation",
              {
                body: respondToInvitationSchema.body,
              },
              async ({ body, user, set }) => {
                try {
                  const result = await teamController.respondToInvitation({
                    body,
                    user,
                  });
                  return {
                    ...result,
                    timestamp: new Date().toISOString(),
                  };
                } catch (error) {
                  logger.error("Failed to respond to invitation", error);
                  set.status = error.status || 500;
                  return {
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString(),
                  };
                }
              }
            )
            .post(
              "/remove-member",
              {
                body: removeMemberSchema.body,
              },
              async ({ body, user, set }) => {
                try {
                  const result = await teamController.removeMember({
                    body,
                    user,
                  });
                  return {
                    ...result,
                    timestamp: new Date().toISOString(),
                  };
                } catch (error) {
                  logger.error("Failed to remove team member", error);
                  set.status = error.status || 500;
                  return {
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString(),
                  };
                }
              }
            )
            .post("/leave-team", async ({ user, set }) => {
              try {
                const result = await teamController.leaveTeam({ user });
                return {
                  ...result,
                  timestamp: new Date().toISOString(),
                };
              } catch (error) {
                logger.error("Failed to leave team", error);
                set.status = error.status || 500;
                return {
                  success: false,
                  error: error.message,
                  timestamp: new Date().toISOString(),
                };
              }
            })
            .get("/available-students", async ({ user, set }) => {
              try {
                const result = await teamController.getAvailableStudents({
                  user,
                });
                return {
                  ...result,
                  timestamp: new Date().toISOString(),
                };
              } catch (error) {
                logger.error("Failed to get available students", error);
                set.status = error.status || 500;
                return {
                  success: false,
                  error: error.message,
                  timestamp: new Date().toISOString(),
                };
              }
            })
        );
      });

      return app;
    })
  );
}
