/**
 * Utility to sanitize response objects to remove non-serializable properties
 * and prevent circular references
 */

const sanitizeResponse = (data) => {
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeResponse(item));
  }

  if (typeof data === "object" && data !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      if (!key.startsWith("_") && key !== "password") {
        sanitized[key] = sanitizeResponse(value);
      }
    }
    return sanitized;
  }

  return data;
};

export default sanitizeResponse;
