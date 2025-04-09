/**
 * Wraps an async route handler to automatically catch and forward errors
 * @param {Function} fn - The async route handler function
 * @returns {Function} - Wrapped function that handles errors
 */
export const asyncHandler = (fn) => {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};

export default asyncHandler;
