import { body, param } from 'express-validator';
import { validate } from './validate.js';

// Validate mark student submission request
export const validateMarkSubmission = [
  param('studentId').isMongoId().withMessage('Invalid student ID'),
  body('marks').isInt({ min: 0, max: 100 }).withMessage('Marks must be between 0 and 100'),
  body('category').isIn(['proposal', 'progress', 'final', 'presentation', 'overall'])
    .withMessage('Invalid assessment category'),
  body('feedback').optional().isString().trim().notEmpty()
    .withMessage('Feedback cannot be empty if provided'),
  validate
];

// Validate bulk notification request
export const validateBulkNotification = [
  body('recipientType').isIn(['all', 'team', 'selected'])
    .withMessage('Invalid recipient type'),
  body('teamId').if(body('recipientType').equals('team'))
    .isMongoId().withMessage('Invalid team ID'),
  body('studentIds').if(body('recipientType').equals('selected'))
    .isArray().withMessage('Student IDs must be an array'),
  body('message').isString().trim().notEmpty()
    .withMessage('Message is required'),
  body('isUrgent').optional().isBoolean(),
  body('type').optional().isIn(['general', 'warning', 'praise'])
    .withMessage('Invalid notification type'),
  validate
];

// Validate progress tracking request
export const validateProgressTracking = [
  body('note').isString().trim().notEmpty()
    .withMessage('Progress note is required'),
  body('progressPercentage').isInt({ min: 0, max: 100 })
    .withMessage('Progress percentage must be between 0 and 100'),
  body('status').optional()
    .isIn(['on_track', 'at_risk', 'behind', 'ahead'])
    .withMessage('Invalid status'),
  body('milestones').optional().isArray(),
  body('notifyStudent').optional().isBoolean(),
  validate
];

// Validate meeting schedule request
export const validateMeetingSchedule = [
  body('entityType').isIn(['Student', 'Team'])
    .withMessage('Invalid entity type'),
  body('entityId').isMongoId()
    .withMessage('Invalid entity ID'),
  body('title').isString().trim().notEmpty()
    .withMessage('Meeting title is required'),
  body('date').isISO8601()
    .withMessage('Invalid date format'),
  body('duration').isInt({ min: 15, max: 180 })
    .withMessage('Duration must be between 15 and 180 minutes'),
  body('isRecurring').optional().isBoolean(),
  validate
];

// Validate consultation request
export const validateConsultation = [
  param('teamId').isMongoId()
    .withMessage('Invalid team ID'),
  body('date').isISO8601()
    .withMessage('Invalid date format'),
  body('duration').isInt({ min: 15, max: 120 })
    .withMessage('Duration must be between 15 and 120 minutes'),
  body('agenda').isString().trim().notEmpty()
    .withMessage('Agenda is required'),
  body('isOnline').optional().isBoolean(),
  validate
];

// Validate feedback request
export const validateFeedback = [
  param('entityType').isIn(['student', 'team'])
    .withMessage('Invalid entity type'),
  param('entityId').isMongoId()
    .withMessage('Invalid entity ID'),
  body('feedback').isString().trim().notEmpty()
    .withMessage('Feedback is required'),
  body('type').optional()
    .isIn(['general', 'technical', 'progress', 'warning', 'praise'])
    .withMessage('Invalid feedback type'),
  body('isUrgent').optional().isBoolean(),
  validate
];