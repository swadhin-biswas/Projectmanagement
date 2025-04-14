import { t } from "elysia";

import { deleteFile, uploadFile } from "../services/fileUploadService.js";
import { authorize } from "../utils/authUtils.js";
import logger from "../utils/logger.js";

export default function uploadRoutes(app) {
  // Apply middleware to ensure all routes in this group require authentication
  app.derive(authorize()); // No specific roles required, but authentication is mandatory

  // Upload file
  app.post(
    "/uploads",
    {
      body: t.Object({
        file: t.Any(),
      }),
      response: {
        200: t.Object({
          success: t.Boolean(),
          data: t.Object({
            url: t.String(),
            type: t.String(),
            name: t.String(),
            size: t.Number(),
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
      },
      detail: {
        summary: "Upload a file",
        description: "Upload a file to the server. Requires authentication.",
        tags: ["Files"],
        security: [{ bearerAuth: [] }], // Indicate Bearer token requirement in Swagger
      },
    },
    async ({ request, user }) => {
      try {
        // Authentication already checked by middleware
        const formData = await request.formData();
        const file = formData.get("file");

        if (!file) {
          return {
            success: false,
            error: "No file provided",
          };
        }

        // Convert File object to expected format for uploadFile
        const fileData = {
          buffer: await file.arrayBuffer(),
          mimetype: file.type,
          originalname: file.name,
          size: file.size,
        };

        const result = await uploadFile(fileData, user.id);
        return {
          success: true,
          data: result,
        };
      } catch (error) {
        logger.error("Upload error:", error);
        return {
          success: false,
          error: error.message || "Failed to upload file",
        };
      }
    }
  );

  // Delete file
  app.delete(
    "/uploads/:url",
    {
      params: t.Object({
        url: t.String(),
      }),
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
      },
      detail: {
        summary: "Delete a file",
        description:
          "Delete a previously uploaded file. Requires authentication.",
        tags: ["Files"],
        security: [{ bearerAuth: [] }], // Indicate Bearer token requirement in Swagger
      },
    },
    async ({ params, user }) => {
      try {
        // Authentication already checked by middleware
        await deleteFile(decodeURIComponent(params.url), user.id);
        return {
          success: true,
          message: "File deleted successfully",
        };
      } catch (error) {
        logger.error("Delete error:", error);
        return {
          success: false,
          error: error.message || "Failed to delete file",
        };
      }
    }
  );

  return app;
}
