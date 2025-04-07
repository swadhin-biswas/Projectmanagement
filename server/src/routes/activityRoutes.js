import { t } from "elysia";
import { authorize } from "../middleware/auth.js";
import { Activity } from "../models/Activity.js";
import { Project } from "../models/Project.js";
import { NotFoundError } from "../utils/errors.js";
import logger from "../utils/logger.js";

export default function activityRoutes(app) {
  return app.group("/projects/:id/activities", (app) => {
    // Common response schemas
    const activitySchema = t.Object({
      _id: t.String(),
      type: t.String(),
      description: t.String(),
      user: t.Object({
        _id: t.String(),
        fullName: t.String(),
        profilePicture: t.Optional(t.String()),
      }),
      metadata: t.Optional(t.Object({})),
      createdAt: t.String(),
    });

    const listResponse = t.Object({
      success: t.Boolean(),
      activities: t.Array(activitySchema),
      hasMore: t.Boolean(),
      total: t.Number(),
    });

    return (
      app
        // Get project activities with pagination
        .get(
          "/",
          {
            beforeHandle: [authorize(["student", "supervisor"])],
            query: t.Object({
              page: t.Optional(t.Number({ default: 1 })),
              limit: t.Optional(t.Number({ default: 20 })),
              type: t.Optional(t.String()),
              startDate: t.Optional(t.String({ format: "date-time" })),
              endDate: t.Optional(t.String({ format: "date-time" })),
            }),
            response: {
              200: listResponse,
            },
          },
          async ({ params, query }) => {
            try {
              logger.info("📋 Fetching project activities", {
                projectId: params.id,
                page: query.page,
                limit: query.limit,
              });

              const project = await Project.findById(params.id);
              if (!project) {
                throw new NotFoundError("Project not found");
              }

              // Build query
              const filter = { project: project._id };
              if (query.type) {
                filter.type = query.type;
              }
              if (query.startDate || query.endDate) {
                filter.createdAt = {};
                if (query.startDate) {
                  filter.createdAt.$gte = new Date(query.startDate);
                }
                if (query.endDate) {
                  filter.createdAt.$lte = new Date(query.endDate);
                }
              }

              const skip = (query.page - 1) * query.limit;

              // Get paginated activities
              const activities = await Activity.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(query.limit)
                .populate("user", "fullName profilePicture");

              // Get total count for pagination
              const total = await Activity.countDocuments(filter);
              const hasMore = skip + activities.length < total;

              return {
                success: true,
                activities,
                hasMore,
                total,
              };
            } catch (error) {
              logger.error("❌ Failed to fetch project activities:", error);
              throw error;
            }
          }
        )

        // Create activity (internal use only)
        .post(
          "/",
          {
            beforeHandle: [authorize(["student", "supervisor"])],
            body: t.Object({
              type: t.String(),
              description: t.String(),
              metadata: t.Optional(t.Object({})),
            }),
            response: {
              201: t.Object({
                success: t.Boolean(),
                activity: activitySchema,
              }),
            },
          },
          async ({ params, body, user }) => {
            try {
              logger.info("📝 Creating activity log", {
                projectId: params.id,
                type: body.type,
              });

              const project = await Project.findById(params.id);
              if (!project) {
                throw new NotFoundError("Project not found");
              }

              const activity = await Activity.create({
                ...body,
                project: project._id,
                user: user.id,
              });

              await activity.populate("user", "fullName profilePicture");

              return {
                success: true,
                activity,
              };
            } catch (error) {
              logger.error("❌ Failed to create activity:", error);
              throw error;
            }
          }
        )

        // Get activity stats
        .get(
          "/stats",
          {
            beforeHandle: [authorize(["student", "supervisor"])],
            query: t.Object({
              startDate: t.Optional(t.String({ format: "date-time" })),
              endDate: t.Optional(t.String({ format: "date-time" })),
            }),
            response: {
              200: t.Object({
                success: t.Boolean(),
                stats: t.Object({
                  totalActivities: t.Number(),
                  byType: t.Object({}),
                  byUser: t.Array(
                    t.Object({
                      _id: t.String(),
                      fullName: t.String(),
                      count: t.Number(),
                    })
                  ),
                }),
              }),
            },
          },
          async ({ params, query }) => {
            try {
              logger.info("📊 Fetching activity statistics", {
                projectId: params.id,
              });

              const project = await Project.findById(params.id);
              if (!project) {
                throw new NotFoundError("Project not found");
              }

              // Build date filter
              const dateFilter = {};
              if (query.startDate || query.endDate) {
                dateFilter.createdAt = {};
                if (query.startDate) {
                  dateFilter.createdAt.$gte = new Date(query.startDate);
                }
                if (query.endDate) {
                  dateFilter.createdAt.$lte = new Date(query.endDate);
                }
              }

              // Get activity stats
              const [totalActivities, byType, byUser] = await Promise.all([
                Activity.countDocuments({
                  project: project._id,
                  ...dateFilter,
                }),
                Activity.aggregate([
                  { $match: { project: project._id, ...dateFilter } },
                  { $group: { _id: "$type", count: { $sum: 1 } } },
                ]),
                Activity.aggregate([
                  { $match: { project: project._id, ...dateFilter } },
                  { $group: { _id: "$user", count: { $sum: 1 } } },
                  {
                    $lookup: {
                      from: "users",
                      localField: "_id",
                      foreignField: "_id",
                      as: "user",
                    },
                  },
                  { $unwind: "$user" },
                  {
                    $project: {
                      _id: "$user._id",
                      fullName: "$user.fullName",
                      count: 1,
                    },
                  },
                ]),
              ]);

              // Format type stats as object
              const typeStats = byType.reduce((acc, { _id, count }) => {
                acc[_id] = count;
                return acc;
              }, {});

              return {
                success: true,
                stats: {
                  totalActivities,
                  byType: typeStats,
                  byUser,
                },
              };
            } catch (error) {
              logger.error("❌ Failed to fetch activity stats:", error);
              throw error;
            }
          }
        )
    );
  });
}
