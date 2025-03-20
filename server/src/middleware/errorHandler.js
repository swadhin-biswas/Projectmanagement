import logger from '../utils/logger.js';

export const errorHandler = {
  name: 'error-handler',
  error: ({ code, error, set }) => {
      // Handle validation errors with proper status code and logging
      if (error.name === 'ValidationError') {
        set.status = 400;
        logger.error('Validation error:', { 
          error: error.message,
          path: error.path,
          field: error.field
        });
        return {
          error: true,
          message: error.message,
          field: error.field // Help client identify which field failed
        };
      }

      // Handle unauthorized access
      if (error.name === 'UnauthorizedError') {
        set.status = 401;
        logger.error('Unauthorized access:', {
          error: error.message,
          path: error.path
        });
        return {
          error: true,
          message: error.message
        };
      }

      // Handle forbidden access
      if (error.name === 'ForbiddenError') {
        set.status = 403;
        logger.error('Forbidden access:', {
          error: error.message,
          path: error.path
        });
        return {
          error: true,
          message: error.message
        };
      }

      // Handle other errors
      logger.error('Server error:', {
        code,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });

      set.status = code === 'NOT_FOUND' ? 404 : 500;
      return {
        error: true,
        message: process.env.NODE_ENV === 'production' 
          ? 'Internal server error' 
          : error.message
      };
    }
};
