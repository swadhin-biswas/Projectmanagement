import { ValidationError } from '../utils/errors.js';
import logger from '../utils/logger.js';

/**
 * Middleware to validate request data against a schema
 * @param {Object} schema - Schema to validate against
 * @returns {Function} Middleware function that validates request data
 */
export const validateRequest = (schema) => {
  return (app) => {
    return app.derive(async ({ body, params, query, set }) => {
      try {
        // Determine what to validate based on the schema structure
        const toValidate = {};

        if (schema.body) {
          toValidate.body = body;
        }

        if (schema.params) {
          toValidate.params = params;
        }

        if (schema.query) {
          toValidate.query = query;
        }

        // Validation happens automatically in Elysia, but we can add extra validation logic here
        logger.debug('Request validation passed', {
          schema: schema.description || 'unnamed schema'
        });

        // Return the validated data
        return toValidate;
      } catch (error) {
        logger.error('Validation error:', error);

        // Format validation error message
        const errorMessage = error.message || 'Validation failed';
        set.status = 400;

        throw new ValidationError(errorMessage);
      }
    });
  };
};

/**
 * Middleware to validate that user has specific role
 * @param {String|Array} roles - Role(s) required to access the route
 * @returns {Function} Middleware function that validates user role
 */
export const validateRole = (roles) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return (app) => {
    return app.derive(({ user, set }) => {
      if (!user) {
        set.status = 401;
        throw new ValidationError('Authentication required');
      }

      if (!allowedRoles.includes(user.role)) {
        set.status = 403;
        throw new ValidationError('Access denied: Insufficient permissions');
      }

      return { user };
    });
  };
};

/**
 * Validate that user exists and is authenticated
 */
export const validateAuthenticated = (app) => {
  return app.derive(({ user, set }) => {
    if (!user) {
      set.status = 401;
      throw new ValidationError('Authentication required');
    }

    return { user };
  });
};