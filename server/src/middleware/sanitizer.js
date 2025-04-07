import { sanitizeFilter } from 'express-mongo-sanitize';
import xss from 'xss';

export const sanitizeInputs = (req, res, next) => {
  if (req.body) {
    // Remove MongoDB operator injection
    req.body = sanitizeFilter(req.body);

    // Sanitize strings to prevent XSS
    req.body = sanitizeObject(req.body);
  }

  if (req.query) {
    req.query = sanitizeFilter(req.query);
    req.query = sanitizeObject(req.query);
  }

  if (req.params) {
    req.params = sanitizeFilter(req.params);
    req.params = sanitizeObject(req.params);
  }

  next();
};

const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  return Object.keys(obj).reduce((sanitized, key) => {
    const value = obj[key];

    if (typeof value === 'string') {
      sanitized[key] = xss(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => sanitizeObject(item));
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }

    return sanitized;
  }, {});
};