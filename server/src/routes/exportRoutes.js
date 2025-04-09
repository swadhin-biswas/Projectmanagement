import { t } from "elysia";
import {
  generateProjectExport,
  generateTeamExport,
} from "../services/exportService.js";
import logger from "../utils/logger.js";

export default function exportRoutes(app) {
  return app.group("/export", (app) => {
    // Common response schemas
    const exportResponse = t.Object({
      success: t.Boolean(),
      data: t.Object({
        fileUrl: t.String(),
        expiresAt: t.String(),
        format: t.String(),
      }),
    });

    const errorResponse = t.Object({
      success: t.Boolean(),
      error: t.String(),
    });

    return (
      app
        // Export project data
        .get(
          "/project/:id",
          {
            query: t.Object({
              format: t.Optional(t.String({ enum: ["pdf", "excel", "json"] })),
              includeSubmissions: t.Optional(t.Boolean()),
              includeComments: t.Optional(t.Boolean()),
              dateRange: t.Optional(
                t.Object({
                  start: t.String({ format: "date-time" }),
                  end: t.String({ format: "date-time" }),
                })
              ),
            }),
            response: {
              200: exportResponse,
              400: errorResponse,
              403: errorResponse,
              404: errorResponse,
              500: errorResponse,
            },
            detail: {
              summary: "Export project data",
              tags: ["Export"],
              description: "Generate a downloadable export of project data",
              security: [{ bearerAuth: [] }],
            },
          },
          async ({ params, query, user, set }) => {
            try {
              logger.info("📤 Generating project export", {
                projectId: params.id,
                format: query.format,
              });

              const exportData = await generateProjectExport({
                projectId: params.id,
                format: query.format || "pdf",
                options: {
                  includeSubmissions: query.includeSubmissions || false,
                  includeComments: query.includeComments || false,
                  dateRange: query.dateRange,
                },
                user,
              });

              return {
                success: true,
                data: exportData,
              };
            } catch (error) {
              logger.error("❌ Project export failed:", error);
              set.status = error.status || 500;
              return {
                success: false,
                error: error.message,
              };
            }
          }
        )

        // Export team data
        .get(
          "/team/:id",
          {
            query: t.Object({
              format: t.Optional(t.String({ enum: ["pdf", "excel", "json"] })),
              includeProjects: t.Optional(t.Boolean()),
              includeActivities: t.Optional(t.Boolean()),
              includeMeetings: t.Optional(t.Boolean()),
              dateRange: t.Optional(
                t.Object({
                  start: t.String({ format: "date-time" }),
                  end: t.String({ format: "date-time" }),
                })
              ),
            }),
            response: {
              200: exportResponse,
              400: errorResponse,
              403: errorResponse,
              404: errorResponse,
              500: errorResponse,
            },
            detail: {
              summary: "Export team data",
              tags: ["Export"],
              description: "Generate a downloadable export of team data",
              security: [{ bearerAuth: [] }],
            },
          },
          async ({ params, query, user, set }) => {
            try {
              logger.info("📤 Generating team export", {
                teamId: params.id,
                format: query.format,
              });

              const exportData = await generateTeamExport({
                teamId: params.id,
                format: query.format || "pdf",
                options: {
                  includeProjects: query.includeProjects || false,
                  includeActivities: query.includeActivities || false,
                  includeMeetings: query.includeMeetings || false,
                  dateRange: query.dateRange,
                },
                user,
              });

              return {
                success: true,
                data: exportData,
              };
            } catch (error) {
              logger.error("❌ Team export failed:", error);
              set.status = error.status || 500;
              return {
                success: false,
                error: error.message,
              };
            }
          }
        )
    );
  });
}
