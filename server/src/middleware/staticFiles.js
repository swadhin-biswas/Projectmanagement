import { promises as fs } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import logger from "../utils/logger.js";

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// MIME types for common file extensions
const MIME_TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".eot": "application/vnd.ms-fontobject",
  ".otf": "font/otf",
};

/**
 * Static file middleware for Elysia.js
 * Serves static files from the specified directory
 *
 * @param {string} staticDir - Directory containing static files, relative to src
 * @returns {Function} Elysia middleware
 */
export const staticFilesMiddleware = (staticDir = "static") => {
  // Construct the absolute path to the static directory
  const staticPath = join(__dirname, "..", staticDir);

  return (app) =>
    app.get("/static/*", async ({ params, set }) => {
      try {
        // Extract the file path from the URL
        const urlPath = params["*"];
        if (!urlPath) {
          set.status = 404;
          return { success: false, error: "File not found" };
        }

        // Construct the absolute path to the requested file
        const filePath = join(staticPath, urlPath);

        // Get file extension to determine content type
        const fileExt = filePath.substring(filePath.lastIndexOf(".") || 0);
        const contentType =
          MIME_TYPES[fileExt.toLowerCase()] || "application/octet-stream";

        try {
          // Try to read the file
          const data = await fs.readFile(filePath);

          // Set the content type header
          set.headers["Content-Type"] = contentType;

          // Return the file contents
          return data;
        } catch (err) {
          if (err.code === "ENOENT") {
            logger.warn(`Static file not found: ${filePath}`);
            set.status = 404;
            return { success: false, error: "File not found" };
          }
          throw err;
        }
      } catch (error) {
        logger.error(`Error serving static file: ${error.message}`, { error });
        set.status = 500;
        return { success: false, error: "Internal server error" };
      }
    });
};

export default staticFilesMiddleware;
