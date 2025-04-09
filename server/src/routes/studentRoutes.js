import { t } from "elysia";
import * as studentController from "../controllers/studentController.js";
import * as teamController from "../controllers/teamController.js";
import { jwtAuth } from "../middleware/auth.js";
import {
  createTeamSchema,
  inviteToTeamSchema,
  removeMemberSchema,
  respondToInvitationSchema,
} from "../schemas/teamSchemas.js";
import { ValidationError } from "../utils/errors.js";
import logger from "../utils/logger.js";

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
  return app.group("/api/students", (app) => {
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

    // Team management routes section
    app.group("/team", (app) => {
      return app
        .get("/", async (context) => {
          try {
            const result = await teamController.getUserTeam(context);
            return {
              ...result,
              timestamp: new Date().toISOString(),
            };
          } catch (error) {
            logger.error("Failed to get user team", error);
            context.set.status = error.status || 500;
            return {
              success: false,
              error: error.message,
              timestamp: new Date().toISOString(),
            };
          }
        })
        .post(
          "/create",
          {
            body: createTeamSchema.body,
          },
          async (context) => {
            try {
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
        .post(
          "/invite",
          {
            body: inviteToTeamSchema.body,
          },
          async (context) => {
            try {
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
        .get("/invitations", async (context) => {
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
        })
        .post(
          "/respond-to-invitation",
          {
            body: respondToInvitationSchema.body,
          },
          async (context) => {
            try {
              const result = await teamController.respondToInvitation(context);
              return {
                ...result,
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
        .post(
          "/remove-member",
          {
            body: removeMemberSchema.body,
          },
          async (context) => {
            try {
              const result = await teamController.removeMember(context);
              return {
                ...result,
                timestamp: new Date().toISOString(),
              };
            } catch (error) {
              logger.error("Failed to remove team member", error);
              context.set.status = error.status || 500;
              return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString(),
              };
            }
          }
        )
        .post("/leave-team", async (context) => {
          try {
            const result = await teamController.leaveTeam(context);
            return {
              ...result,
              timestamp: new Date().toISOString(),
            };
          } catch (error) {
            logger.error("Failed to leave team", error);
            context.set.status = error.status || 500;
            return {
              success: false,
              error: error.message,
              timestamp: new Date().toISOString(),
            };
          }
        })
        .get("/available-students", async (context) => {
          try {
            const result = await teamController.getAvailableStudents(context);
            return {
              ...result,
              timestamp: new Date().toISOString(),
            };
          } catch (error) {
            logger.error("Failed to get available students", error);
            context.set.status = error.status || 500;
            return {
              success: false,
              error: error.message,
              timestamp: new Date().toISOString(),
            };
          }
        });
    });

    // Continue with the rest of the student routes
    return (
      app
        // Profile and session management
        .get(
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
            detail: {
              tags: ["Students"],
              summary: "Get student profile",
              security: [{ bearerAuth: [] }],
            },
          },
          async ({ user, set }) => {
            try {
              const result = await studentController.getStudentProfile(user.id);
              return result;
            } catch (error) {
              set.status = error.status || 500;
              return {
                success: false,
                error: error.message,
              };
            }
          }
        )

        // Deadlines
        .get(
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
            detail: {
              tags: ["Students"],
              summary: "Get deadlines",
              security: [{ bearerAuth: [] }],
            },
          },
          async ({ user, set }) => {
            try {
              const result = await studentController.getStudentDeadlines(
                user.id
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
        )

        // Submissions
        .post(
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
            detail: {
              tags: ["Students"],
              summary: "Submit report",
              security: [{ bearerAuth: [] }],
            },
          },
          async ({ body, user, set }) => {
            try {
              const result = await studentController.submitReport(
                user.id,
                body
              );
              set.status = 201; // Created
              return result;
            } catch (error) {
              set.status = error.status || 500;
              return {
                success: false,
                error: error.message,
              };
            }
          }
        )

        // Messages
        .get(
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
            detail: {
              tags: ["Students"],
              summary: "Get messages",
              security: [{ bearerAuth: [] }],
            },
          },
          async ({ user, set }) => {
            try {
              const result = await studentController.getStudentMessages(
                user.id
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
        )

        .put(
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
            detail: {
              tags: ["Students"],
              summary: "Mark message as read",
              security: [{ bearerAuth: [] }],
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
        )

        // Results routes
        .group("/results", (app) => {
          return app
            .get(
              "/",
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
                detail: {
                  tags: ["Students", "Results"],
                  summary: "Get all student results",
                  security: [{ bearerAuth: [] }],
                },
              },
              async ({ user, set }) => {
                try {
                  const result = await studentController.getStudentResults({
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
            )

            .get(
              "/:resultId",
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
                detail: {
                  tags: ["Students", "Results"],
                  summary: "Get detailed view of a specific result",
                  security: [{ bearerAuth: [] }],
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
        })
    );
  });
}
