import { Elysia, t } from "elysia";
import { authorize } from "../middleware/auth.js";
import { Project } from "../models/Project.js";
import { Student } from "../models/Student.js";
import { Team } from "../models/Team.js";
import { ForbiddenError, NotFoundError } from "../utils/errors.js";
import logger from "../utils/logger.js";

// Create and export the Elysia plugin directly
export default new Elysia().group("/projects/:id/milestones", (app) => {
  // Response schemas
  const milestoneSchema = t.Object({
    _id: t.String(),
    title: t.String(),
    description: t.String(),
    dueDate: t.String(),
    status: t.String(),
    assignedTo: t.Optional(
      t.Array(
        t.Object({
          _id: t.String(),
          fullName: t.String(),
        })
      )
    ),
    createdAt: t.String(),
    updatedAt: t.String(),
  });

  const successResponse = t.Object({
    success: t.Boolean(),
    milestone: milestoneSchema,
  });

  return (
    app
      // Create milestone
      .post(
        "/",
        {
          beforeHandle: [authorize(["student"])],
          body: t.Object({
            title: t.String({ minLength: 3 }),
            description: t.String(),
            dueDate: t.String({ format: "date-time" }),
            assignedTo: t.Optional(t.Array(t.String())),
          }),
          response: {
            201: successResponse,
          },
        },
        async ({ params, body, user }) => {
          try {
            logger.info("📝 Creating milestone", { projectId: params.id });
            const project = await Project.findById(params.id);
            if (!project) {
              throw new NotFoundError("Project not found");
            }

            // Verify team membership and leadership
            const student = await Student.findOne({ user: user.id });
            const team = await Team.findById(project.team).populate(
              "members.user"
            );
            if (!team) {
              throw new NotFoundError("Team not found");
            }

            const isMember = team.members.find(
              (m) =>
                m.user._id.toString() === user.id &&
                m.status === "active" &&
                m.role === "leader"
            );

            if (!isMember) {
              throw new ForbiddenError(
                "Only team leader can create milestones"
              );
            }

            project.milestones.push({
              ...body,
              status: "pending",
              createdBy: user.id,
            });

            await project.save();
            const milestone = project.milestones[project.milestones.length - 1];

            return {
              success: true,
              milestone: {
                _id: milestone._id,
                title: milestone.title,
                description: milestone.description,
                dueDate: milestone.dueDate,
                status: milestone.status,
                assignedTo: body.assignedTo
                  ? await Team.populate(milestone, "assignedTo")
                  : [],
                createdAt: milestone.createdAt,
                updatedAt: milestone.updatedAt,
              },
            };
          } catch (error) {
            logger.error("❌ Failed to create milestone:", error);
            throw error;
          }
        }
      )

      // Update milestone
      .patch(
        "/:milestoneId",
        {
          beforeHandle: [authorize(["student"])],
          body: t.Object({
            title: t.Optional(t.String({ minLength: 3 })),
            description: t.Optional(t.String()),
            dueDate: t.Optional(t.String({ format: "date-time" })),
            status: t.Optional(
              t.String({ enum: ["pending", "in_progress", "completed"] })
            ),
            assignedTo: t.Optional(t.Array(t.String())),
          }),
          response: {
            200: successResponse,
          },
        },
        async ({ params, body, user }) => {
          try {
            logger.info("✏️ Updating milestone", {
              projectId: params.id,
              milestoneId: params.milestoneId,
            });

            const project = await Project.findById(params.id);
            if (!project) {
              throw new NotFoundError("Project not found");
            }

            const milestone = project.milestones.id(params.milestoneId);
            if (!milestone) {
              throw new NotFoundError("Milestone not found");
            }

            // Verify team membership and leadership
            const student = await Student.findOne({ user: user.id });
            const team = await Team.findById(project.team).populate(
              "members.user"
            );
            const isMember = team.members.find(
              (m) =>
                m.user._id.toString() === user.id &&
                m.status === "active" &&
                m.role === "leader"
            );

            if (!isMember) {
              throw new ForbiddenError(
                "Only team leader can update milestones"
              );
            }

            // Update allowed fields
            if (body.title) milestone.title = body.title;
            if (body.description) milestone.description = body.description;
            if (body.dueDate) milestone.dueDate = body.dueDate;
            if (body.status) milestone.status = body.status;
            if (body.assignedTo) milestone.assignedTo = body.assignedTo;

            milestone.updatedAt = new Date();
            await project.save();

            return {
              success: true,
              milestone: {
                _id: milestone._id,
                title: milestone.title,
                description: milestone.description,
                dueDate: milestone.dueDate,
                status: milestone.status,
                assignedTo: milestone.assignedTo
                  ? await Team.populate(milestone, "assignedTo")
                  : [],
                createdAt: milestone.createdAt,
                updatedAt: milestone.updatedAt,
              },
            };
          } catch (error) {
            logger.error("❌ Failed to update milestone:", error);
            throw error;
          }
        }
      )

      // Delete milestone
      .delete(
        "/:milestoneId",
        {
          beforeHandle: [authorize(["student"])],
          response: {
            200: t.Object({
              success: t.Boolean(),
              message: t.String(),
            }),
          },
        },
        async ({ params, user }) => {
          try {
            logger.info("🗑️ Deleting milestone", {
              projectId: params.id,
              milestoneId: params.milestoneId,
            });

            const project = await Project.findById(params.id);
            if (!project) {
              throw new NotFoundError("Project not found");
            }

            // Verify team membership and leadership
            const student = await Student.findOne({ user: user.id });
            const team = await Team.findById(project.team).populate(
              "members.user"
            );
            const isMember = team.members.find(
              (m) =>
                m.user._id.toString() === user.id &&
                m.status === "active" &&
                m.role === "leader"
            );

            if (!isMember) {
              throw new ForbiddenError(
                "Only team leader can delete milestones"
              );
            }

            project.milestones = project.milestones.filter(
              (m) => m._id.toString() !== params.milestoneId
            );
            await project.save();

            return {
              success: true,
              message: "Milestone deleted successfully",
            };
          } catch (error) {
            logger.error("❌ Failed to delete milestone:", error);
            throw error;
          }
        }
      )
  );
});
