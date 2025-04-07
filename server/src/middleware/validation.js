import { ValidationError } from '../utils/errors.js';

// Validate request body against schema
export const validateRequest = (schema) => {
  return async (context, next) => {
    try {
      if (!schema) {
        return next();
      }

      const { body, query, params } = context;

      // Validate body if schema has body validation rules
      if (schema.body && body) {
        const { error } = schema.body.validate(body, { abortEarly: false });
        if (error) {
          throw new ValidationError('Invalid request body', formatValidationErrors(error));
        }
      }

      // Validate query parameters if schema has query validation rules
      if (schema.query && query) {
        const { error } = schema.query.validate(query, { abortEarly: false });
        if (error) {
          throw new ValidationError('Invalid query parameters', formatValidationErrors(error));
        }
      }

      // Validate URL parameters if schema has params validation rules
      if (schema.params && params) {
        const { error } = schema.params.validate(params, { abortEarly: false });
        if (error) {
          throw new ValidationError('Invalid URL parameters', formatValidationErrors(error));
        }
      }

      return next();
    } catch (error) {
      throw error;
    }
  };
};

// Validate file uploads
export const validateFileUpload = (options = {}) => {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'],
    maxFiles = 1
  } = options;

  return async (context, next) => {
    const files = context.request.files;

    if (!files) {
      throw new ValidationError('No files uploaded');
    }

    const fileArray = Array.isArray(files) ? files : [files];

    if (fileArray.length > maxFiles) {
      throw new ValidationError(`Maximum ${maxFiles} files allowed`);
    }

    for (const file of fileArray) {
      // Check file size
      if (file.size > maxSize) {
        throw new ValidationError(`File size exceeds ${maxSize / (1024 * 1024)}MB limit`);
      }

      // Check file type
      if (!allowedTypes.includes(file.mimetype)) {
        throw new ValidationError('Invalid file type. Allowed types: ' + allowedTypes.join(', '));
      }
    }

    return next();
  };
};

// Validate project submission
export const validateProjectSubmission = () => {
  return async (context, next) => {
    const { body } = context;
    const requiredFields = ['submissionLink'];
    const missingFields = requiredFields.filter(field => !body[field]);

    if (missingFields.length > 0) {
      throw new ValidationError('Missing required fields', {
        missing: missingFields
      });
    }

    // Validate submission link format
    if (!isValidUrl(body.submissionLink)) {
      throw new ValidationError('Invalid submission link format');
    }

    // If GitHub URL is provided, validate format
    if (body.githubUrl && !isValidGitHubUrl(body.githubUrl)) {
      throw new ValidationError('Invalid GitHub repository URL format');
    }

    // If deployed URL is provided, validate format
    if (body.deployedUrl && !isValidUrl(body.deployedUrl)) {
      throw new ValidationError('Invalid deployed URL format');
    }

    return next();
  };
};

// Validate marking submission
export const validateMarking = () => {
  return async (context, next) => {
    const { body } = context;

    if (!body.marks || body.marks < 0 || body.marks > 100) {
      throw new ValidationError('Marks must be between 0 and 100');
    }

    if (!body.feedback || body.feedback.trim().length < 10) {
      throw new ValidationError('Feedback must be at least 10 characters long');
    }

    if (body.submissionType && !['project', 'report', 'presentation'].includes(body.submissionType)) {
      throw new ValidationError('Invalid submission type');
    }

    return next();
  };
};

// Helper functions
const formatValidationErrors = (error) => {
  return error.details.reduce((acc, detail) => {
    const key = detail.path.join('.');
    acc[key] = detail.message;
    return acc;
  }, {});
};

const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const isValidGitHubUrl = (url) => {
  return /^https:\/\/github\.com\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-_.]+\/?$/.test(url);
};
