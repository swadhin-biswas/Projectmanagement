import { ValidationError } from '../utils/errors.js';

const ALLOWED_FILE_TYPES = {
  'application/pdf': ['pdf'],
  'application/msword': ['doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
  'application/vnd.ms-powerpoint': ['ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['pptx'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/gif': ['gif'],
  'application/zip': ['zip'],
  'text/plain': ['txt'],
  'text/markdown': ['md'],
  'application/json': ['json'],
  'text/csv': ['csv']
};

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export const validateFileUpload = (options = {}) => {
  const {
    maxSize = MAX_FILE_SIZE,
    allowedTypes = ALLOWED_FILE_TYPES,
    maxFiles = 5,
    required = false
  } = options;

  return (req, res, next) => {
    try {
      // Check if files are required
      if (required && (!req.files || req.files.length === 0)) {
        throw new ValidationError('File upload is required');
      }

      if (!req.files) {
        return next();
      }

      const files = Array.isArray(req.files) ? req.files : [req.files];

      // Check number of files
      if (files.length > maxFiles) {
        throw new ValidationError(`Maximum ${maxFiles} files allowed`);
      }

      // Validate each file
      files.forEach(file => {
        // Check file size
        if (file.size > maxSize) {
          throw new ValidationError(`File ${file.originalname} exceeds maximum size of ${maxSize / (1024 * 1024)}MB`);
        }

        // Check file type
        const isValidType = Object.keys(allowedTypes).some(type => {
          if (file.mimetype === type) {
            const extension = file.originalname.split('.').pop().toLowerCase();
            return allowedTypes[type].includes(extension);
          }
          return false;
        });

        if (!isValidType) {
          throw new ValidationError(`Invalid file type for ${file.originalname}. Allowed types: ${Object.values(allowedTypes).flat().join(', ')}`);
        }

        // Check for potential malicious filenames
        if (/[<>:"/\\|?*\x00-\x1F]/.test(file.originalname)) {
          throw new ValidationError(`Invalid characters in filename: ${file.originalname}`);
        }
      });

      next();
    } catch (error) {
      next(error);
    }
  };
};