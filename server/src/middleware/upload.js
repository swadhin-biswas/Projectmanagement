import multer from 'multer';
import logger from '../utils/logger.js';
import { validateFileSize, validateMimeType } from '../validators/teamValidator.js';

// Configure multer for file uploads
export const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    try {
      if (!validateMimeType(file.mimetype) || !validateFileSize(file.size)) {
        cb(new Error('Invalid file type or size'));
        return;
      }
      cb(null, true);
    } catch (error) {
      logger.error('File validation error:', error);
      cb(new Error(error.message));
    }
  },
  storage: multer.memoryStorage() // Store files in memory for processing
});

// Error handling middleware for upload errors
export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    logger.error('Multer error:', err);
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }

  if (err) {
    logger.error('Upload error:', err);
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }

  next();
};