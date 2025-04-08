import { t } from "elysia";
import { authorize } from "../middleware/auth.js";
import { deleteFile, uploadFile } from "../services/fileUploadService.js";
import logger from "../utils/logger.js";

export default function uploadRoutes(app) {
  // Upload file
  app.post("/uploads", {
    beforeHandle: [authorize(['student', 'supervisor', 'admin'])],
    body: t.Object({
      file: t.Any()
    }),
    response: {
      200: t.Object({
        success: t.Boolean(),
        data: t.Object({
          url: t.String(),
          type: t.String(),
          name: t.String(),
          size: t.Number()
        })
      }),
      400: t.Object({
        success: t.Boolean(),
        error: t.String()
      })
    }
  }, async ({ request, user }) => {
    try {
      if (!user || !user.id) {
        return {
          success: false,
          error: 'Authentication required'
        };
      }

      const formData = await request.formData();
      const file = formData.get('file');

      if (!file) {
        return {
          success: false,
          error: 'No file provided'
        };
      }

      // Convert File object to expected format for uploadFile
      const fileData = {
        buffer: await file.arrayBuffer(),
        mimetype: file.type,
        originalname: file.name,
        size: file.size
      };

      const result = await uploadFile(fileData, user.id);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      logger.error('Upload error:', error);
      return {
        success: false,
        error: error.message || 'Failed to upload file'
      };
    }
  });

  // Delete file
  app.delete("/uploads/:url", {
    beforeHandle: [authorize(['student', 'supervisor', 'admin'])],
    response: {
      200: t.Object({
        success: t.Boolean(),
        message: t.String()
      }),
      400: t.Object({
        success: t.Boolean(),
        error: t.String()
      })
    }
  }, async ({ params, user }) => {
    try {
      if (!user || !user.id) {
        return {
          success: false,
          error: 'Authentication required'
        };
      }

      await deleteFile(decodeURIComponent(params.url), user.id);
      return {
        success: true,
        message: 'File deleted successfully'
      };
    } catch (error) {
      logger.error('Delete error:', error);
      return {
        success: false,
        error: error.message || 'Failed to upload file'
      };
    }
  });

  return app;
}