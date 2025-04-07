/**
 * Response formatter middleware for Elysia framework
 * This middleware ensures consistent response formatting
 */
export const responseFormatter = () => ({
  beforeHandle: ({ set }) => {
    const originalJson = set.json;
    set.json = (data) => {
      if (data && typeof data === "object") {
        return originalJson({
          success: !data.error,
          ...data,
          timestamp: new Date().toISOString(),
        });
      }
      return originalJson(data);
    };
  },
});
