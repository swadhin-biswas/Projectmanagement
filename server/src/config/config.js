import dotenv from 'dotenv';
import logger from '../utils/logger.js';

// Load environment variables
dotenv.config();

// Default configuration
export const config = {
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173'
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-fallback-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
  },

  // Database configuration
  db: {
    uri: process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/default-db'
  },

  // Email configuration
  email: {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM || 'noreply@example.com'
  },

  // File uploads
  uploads: {
    maxSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10), // 5MB by default
    allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,application/pdf').split(','),
    storage: process.env.STORAGE_TYPE || 'local' // 'local' or 's3'
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug')
  }
};

// Validate critical configuration
if (!config.jwt.secret || config.jwt.secret === 'your-fallback-secret-key') {
  if (process.env.NODE_ENV === 'production') {
    logger.error('FATAL ERROR: JWT_SECRET is not defined in production environment');
    process.exit(1);
  } else {
    logger.warn('WARNING: Using fallback JWT_SECRET in development environment. This is not secure for production.');
  }
}

// Export configuration
export default config;