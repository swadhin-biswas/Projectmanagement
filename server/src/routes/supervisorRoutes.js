import {
  getProjectRequests,
  getSupervisedProjects,
  getSupervisedTeams,
  getSupervisorProfile,
  updateSupervisorProfile,
  evaluateProject,
  provideFeedback,
  scheduleConsultation
} from "../controllers/supervisorController.js";
import { authorize } from "../middleware/auth.js";
import { t } from "elysia";
import logger from "../utils/logger.js";

export default function supervisorRoutes(app) {
  return app.group("/supervisor", app => {
    // Common response schemas
    const profileSchema = t.Object({
      _id: t.String(),
      user: t.Object({
        _id: t.String(),
        fullName: t.String(),
        email: t.String(),
        department: t.String(),
        profilePicture: t.Optional(t.String())
      }),
      specialization: t.String(),
      bio: t.Optional(t.String()),
      researchInterests: t.Array(t.String()),
      officeHours: t.Optional(t.String()),
      contactInformation: t.Object({
        officeLocation: t.Optional(t.String()),
        phoneNumber: t.Optional(t.String()),
        alternateEmail: t.Optional(t.String())
      }),
      maxTeams: t.Number(),
      currentTeams: t.Number()
    });

    return app
      // Profile management
      .group("/profile", app => app
        .get("/", {
          response: {
            200: t.Object({
              success: t.Boolean(),
              data: profileSchema
            })
          },
          detail: {
            summary: "Get supervisor profile",
            tags: ["Supervisor", "Profile"],
            security: [{ bearerAuth: [] }]
          }
        }, async ({ user }) => {
          try {
            logger.info("👤 Fetching supervisor profile");
            await authorize(["supervisor"])(user);
            const profile = await getSupervisorProfile({ user });
            return { success: true, data: profile };
          } catch (error) {
            logger.error("❌ Failed to fetch supervisor profile:", error);
            throw error;
          }
        })

        .put("/", {
          body: t.Object({
            fullName: t.Optional(t.String()),
            email: t.Optional(t.String({ format: "email" })),
            department: t.Optional(t.String()),
            profilePicture: t.Optional(t.String()),
            specialization: t.Optional(t.String()),
            bio: t.Optional(t.String()),
            researchInterests: t.Optional(t.Array(t.String())),
            officeHours: t.Optional(t.String()),
            contactInformation: t.Optional(t.Object({
              officeLocation: t.Optional(t.String()),
              phoneNumber: t.Optional(t.String()),
              alternateEmail: t.Optional(t.String())
            }))
          }),
          response: {
            200: t.Object({
              success: t.Boolean(),
              data: profileSchema
            })
          },
          detail: {
            summary: "Update supervisor profile",
            tags: ["Supervisor", "Profile"],
            security: [{ bearerAuth: [] }]
          }
        }, async ({ user, body }) => {
          try {
            logger.info("✏️ Updating supervisor profile");
            await authorize(["supervisor"])(user);
            const profile = await updateSupervisorProfile({ user, body });
            return { success: true, data: profile };
          } catch (error) {
            logger.error("❌ Failed to update supervisor profile:", error);
            throw error;
          }
        })
      )

      // Project management
      .group("/projects", app => app
        .get("/", {
          query: t.Object({
            status: t.Optional(t.String()),
            type: t.Optional(t.String()),
            search: t.Optional(t.String())
          }),
          response: {
            200: t.Object({
              success: t.Boolean(),
              data: t.Array(t.Object({
                _id: t.String(),
                name: t.String(),
                type: t.String(),
                status: t.String(),
                team: t.Object({
                  _id: t.String(),
                  name: t.String()
                }),
                lastActivity: t.String()
              }))
            })
          },
          detail: {
            summary: "Get supervised projects",
            tags: ["Supervisor", "Projects"],
            security: [{ bearerAuth: [] }]
          }
        }, async ({ user, query }) => {
          try {
            logger.info("📚 Fetching supervised projects");
            await authorize(["supervisor"])(user);
            const projects = await getSupervisedProjects({ user, query });
            return { success: true, data: projects };
          } catch (error) {
            logger.error("❌ Failed to fetch supervised projects:", error);
            throw error;
          }
        })

        .get("/requests", {
          response: {
            200: t.Object({
              success: t.Boolean(),
              data: t.Array(t.Object({
                _id: t.String(),
                project: t.Object({
                  _id: t.String(),
                  name: t.String(),
                  type: t.String()
                }),
                team: t.Object({
                  _id: t.String(),
                  name: t.String()
                }),
                requestedAt: t.String(),
                status: t.String()
              }))
            })
          },
          detail: {
            summary: "Get project supervision requests",
            tags: ["Supervisor", "Projects"],
            security: [{ bearerAuth: [] }]
          }
        }, async ({ user }) => {
          try {
            logger.info("📫 Fetching supervision requests");
            await authorize(["supervisor"])(user);
            const requests = await getProjectRequests({ user });
            return { success: true, data: requests };
          } catch (error) {
            logger.error("❌ Failed to fetch supervision requests:", error);
            throw error;
          }
        })

        .post("/:projectId/evaluate", {
          body: t.Object({
            score: t.Number({ minimum: 0, maximum: 100 }),
            feedback: t.String(),
            milestoneId: t.Optional(t.String())
          }),
          response: {
            200: t.Object({
              success: t.Boolean(),
              message: t.String()
            })
          },
          detail: {
            summary: "Evaluate project or milestone",
            tags: ["Supervisor", "Projects"],
            security: [{ bearerAuth: [] }]
          }
        }, async ({ user, params, body }) => {
          try {
            logger.info("✍️ Evaluating project", { projectId: params.projectId });
            await authorize(["supervisor"])(user);
            await evaluateProject({ user, projectId: params.projectId, ...body });
            return { success: true, message: "Evaluation submitted successfully" };
          } catch (error) {
            logger.error("❌ Failed to submit evaluation:", error);
            throw error;
          }
        })
      )

      // Team management
      .group("/teams", app => app
        .get("/", {
          response: {
            200: t.Object({
              success: t.Boolean(),
              data: t.Array(t.Object({
                _id: t.String(),
                name: t.String(),
                members: t.Array(t.Object({
                  _id: t.String(),
                  fullName: t.String(),
                  email: t.String(),
                  role: t.String()
                })),
                project: t.Object({
                  _id: t.String(),
                  name: t.String(),
                  status: t.String()
                })
              }))
            })
          },
          detail: {
            summary: "Get supervised teams",
            tags: ["Supervisor", "Teams"],
            security: [{ bearerAuth: [] }]
          }
        }, async ({ user }) => {
          try {
            logger.info("👥 Fetching supervised teams");
            await authorize(["supervisor"])(user);
            const teams = await getSupervisedTeams({ user });
            return { success: true, data: teams };
          } catch (error) {
            logger.error("❌ Failed to fetch supervised teams:", error);
            throw error;
          }
        })

        .post("/:teamId/feedback", {
          body: t.Object({
            content: t.String(),
            type: t.String({ enum: ["general", "technical", "progress"] }),
            priority: t.Optional(t.String({ enum: ["low", "medium", "high"] }))
          }),
          response: {
            200: t.Object({
              success: t.Boolean(),
              message: t.String()
            })
          },
          detail: {
            summary: "Provide team feedback",
            tags: ["Supervisor", "Teams"],
            security: [{ bearerAuth: [] }]
          }
        }, async ({ user, params, body }) => {
          try {
            logger.info("💬 Providing team feedback", { teamId: params.teamId });
            await authorize(["supervisor"])(user);
            await provideFeedback({ user, teamId: params.teamId, ...body });
            return { success: true, message: "Feedback submitted successfully" };
          } catch (error) {
            logger.error("❌ Failed to submit feedback:", error);
            throw error;
          }
        })

        .post("/:teamId/consultations", {
          body: t.Object({
            date: t.String({ format: "date-time" }),
            duration: t.Number({ minimum: 15, maximum: 120 }),
            agenda: t.String(),
            location: t.Optional(t.String()),
            isOnline: t.Optional(t.Boolean())
          }),
          response: {
            200: t.Object({
              success: t.Boolean(),
              data: t.Object({
                _id: t.String(),
                date: t.String(),
                duration: t.Number(),
                agenda: t.String(),
                location: t.Optional(t.String()),
                isOnline: t.Boolean()
              })
            })
          },
          detail: {
            summary: "Schedule team consultation",
            tags: ["Supervisor", "Teams"],
            security: [{ bearerAuth: [] }]
          }
        }, async ({ user, params, body }) => {
          try {
            logger.info("📅 Scheduling consultation", { teamId: params.teamId });
            await authorize(["supervisor"])(user);
            const consultation = await scheduleConsultation({ user, teamId: params.teamId, ...body });
            return { success: true, data: consultation };
          } catch (error) {
            logger.error("❌ Failed to schedule consultation:", error);
            throw error;
          }
        })
      );
  });
}
