import Joi from 'joi';

// Notification creation validation schema
export const createNotificationSchema = Joi.object({
  userId: Joi.string().required(),
  title: Joi.string().required().min(3).max(100),
  message: Joi.string().required().min(10).max(2000),
  type: Joi.string().valid(
    'info',
    'warning',
    'deadline',
    'grade',
    'feedback',
    'team',
    'project',
    'supervisor',
    'system'
  ).required(),
  priority: Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal'),
  relatedTo: Joi.object({
    model: Joi.string().valid('Project', 'Team', 'Session', 'Submission').required(),
    id: Joi.string().required()
  }).optional(),
  from: Joi.object({
    role: Joi.string().valid('system', 'admin', 'supervisor', 'student').required(),
    user: Joi.string().optional()
  }).optional(),
  requiresAction: Joi.boolean().default(false),
  actionUrl: Joi.string().uri().optional(),
  dueDate: Joi.date().optional(),
  category: Joi.string().valid(
    'academic',
    'administrative',
    'technical',
    'communication',
    'other'
  ).default('other')
});

// Notification preferences validation schema
export const notificationPreferencesSchema = Joi.object({
  email: Joi.object({
    enabled: Joi.boolean().default(true),
    digest: Joi.string().valid('none', 'immediate', 'daily', 'weekly').default('immediate'),
    types: Joi.array().items(
      Joi.string().valid(
        'deadline',
        'grade',
        'feedback',
        'team',
        'project',
        'supervisor',
        'system'
      )
    ).default(['deadline', 'grade', 'feedback'])
  }).required(),
  push: Joi.object({
    enabled: Joi.boolean().default(true),
    quiet_hours: Joi.object({
      enabled: Joi.boolean().default(false),
      start: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      end: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    }).optional(),
    types: Joi.array().items(
      Joi.string().valid(
        'deadline',
        'grade',
        'feedback',
        'team',
        'project',
        'supervisor',
        'system'
      )
    ).default(['deadline', 'grade', 'feedback'])
  }).required(),
  inApp: Joi.object({
    enabled: Joi.boolean().default(true),
    types: Joi.array().items(
      Joi.string().valid(
        'deadline',
        'grade',
        'feedback',
        'team',
        'project',
        'supervisor',
        'system'
      )
    ).default(['deadline', 'grade', 'feedback', 'team', 'project', 'supervisor', 'system'])
  }).required()
});

// Bulk notification validation schema
export const bulkNotificationSchema = Joi.object({
  recipients: Joi.array().items(
    Joi.alternatives().try(
      Joi.string(), // userId
      Joi.object({
        role: Joi.string().valid('student', 'supervisor', 'admin').required(),
        filters: Joi.object({
          department: Joi.string().optional(),
          semester: Joi.number().optional(),
          team: Joi.string().optional(),
          project: Joi.string().optional()
        }).optional()
      })
    )
  ).required(),
  notification: Joi.object({
    title: Joi.string().required().min(3).max(100),
    message: Joi.string().required().min(10).max(2000),
    type: Joi.string().valid(
      'info',
      'warning',
      'deadline',
      'system'
    ).required(),
    priority: Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal')
  }).required(),
  channels: Joi.array().items(
    Joi.string().valid('email', 'push', 'inApp')
  ).min(1).required(),
  scheduling: Joi.object({
    sendAt: Joi.date().greater('now').optional(),
    repeat: Joi.object({
      frequency: Joi.string().valid('daily', 'weekly', 'monthly').optional(),
      until: Joi.date().greater('now').optional()
    }).optional()
  }).optional()
});

// Team notification validation schema
export const teamNotificationSchema = Joi.object({
  teamId: Joi.string().required(),
  message: Joi.string().required().min(10).max(2000),
  type: Joi.string().valid(
    'announcement',
    'reminder',
    'warning',
    'meeting',
    'feedback'
  ).required(),
  priority: Joi.string().valid('low', 'normal', 'high').default('normal'),
  mentionedUsers: Joi.array().items(Joi.string()).optional(),
  attachments: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      url: Joi.string().required().uri(),
      type: Joi.string().required(),
      size: Joi.number().required()
    })
  ).optional()
});

// Reminder validation schema
export const reminderSchema = Joi.object({
  userId: Joi.string().required(),
  title: Joi.string().required().min(3).max(100),
  description: Joi.string().required().min(10).max(500),
  dueDate: Joi.date().greater('now').required(),
  reminderDate: Joi.date().less(Joi.ref('dueDate')).required(),
  type: Joi.string().valid(
    'deadline',
    'meeting',
    'task',
    'other'
  ).required(),
  recurrence: Joi.object({
    frequency: Joi.string().valid('once', 'daily', 'weekly').required(),
    until: Joi.date().greater(Joi.ref('dueDate')).optional()
  }).optional(),
  notifyVia: Joi.array().items(
    Joi.string().valid('email', 'push', 'inApp')
  ).min(1).required()
});