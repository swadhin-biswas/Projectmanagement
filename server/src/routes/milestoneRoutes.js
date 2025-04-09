import { Elysia, t } from "elysia";

import { Project } from "../models/Project.js";
import { Student } from "../models/Student.js";
import { ForbiddenError, NotFoundError } from "../utils/errors.js";
import logger from "../utils/logger.js";

// Create and export the Elysia instance directly
export const milestoneRoutes = new Elysia({
  prefix: "/api/projects/:id/milestones",
})
  .get(
    "/",
    {
      response: {
        200: t.Object({
          success: t.Boolean(),
          data: t.Array(
            t.Object({
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
            })
          ),
        }),
      },
    },
    async ({ params, user, set }) => {
      try {
        logger.info("📋 Fetching project milestones");
        await authorize(["student", "supervisor"])(user);
        const project = await Project.findById(params.id);

        if (!project) {
          throw new NotFoundError("Project not found");
        }

        return {
          success: true,
          data: project.milestones,
        };
      } catch (error) {
        logger.error("❌ Failed to fetch milestones:", error);
        set.status = error.status || 500;
        return { success: false, error: error.message };
      }
    }
  )
  .post(
    "/",
    {
      body: t.Object({
        title: t.String(),
        description: t.String(),
        dueDate: t.String({ format: "date-time" }),
        assignedTo: t.Optional(t.Array(t.String())),
      }),
      response: {
        201: t.Object({
          success: t.Boolean(),
          data: t.Object({
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
          }),
        }),
      },
    },
    async ({ params, body, user, set }) => {
      try {
        logger.info("📝 Creating new milestone");
        await authorize(["student"])(user);

        const project = await Project.findById(params.id);
        if (!project) {
          throw new NotFoundError("Project not found");
        }

        const student = await Student.findOne({ user: user.id }).populate(
          "team"
        );
        if (
          !student?.team ||
          student.team._id.toString() !== project.team.toString()
        ) {
          throw new ForbiddenError(
            "Not authorized to add milestones to this project"
          );
        }

        project.milestones.push({
          ...body,
          status: "pending",
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        await project.save();
        set.status = 201;

        return {
          success: true,
          data: project.milestones[project.milestones.length - 1],
        };
      } catch (error) {
        logger.error("❌ Failed to create milestone:", error);
        set.status = error.status || 500;
        return { success: false, error: error.message };
      }
    }
  );

export default milestoneRoutes;
