import Joi from 'joi';

// Calendar event validation schema
export const calendarEventSchema = Joi.object({
  title: Joi.string().required().min(3).max(100),
  type: Joi.string().valid(
    'meeting',
    'presentation',
    'deadline',
    'submission',
    'review',
    'other'
  ).required(),
  startTime: Joi.date().required(),
  endTime: Joi.date().greater(Joi.ref('startTime')).required(),
  location: Joi.alternatives().try(
    Joi.string(),
    Joi.object({
      type: Joi.string().valid('physical', 'online').required(),
      details: Joi.when('type', {
        is: 'physical',
        then: Joi.object({
          room: Joi.string().required(),
          building: Joi.string().required(),
          campus: Joi.string().optional()
        }),
        otherwise: Joi.object({
          platform: Joi.string().required(),
          link: Joi.string().uri().required(),
          password: Joi.string().optional()
        })
      })
    })
  ).required(),
  description: Joi.string().max(1000).optional(),
  organizer: Joi.object({
    userId: Joi.string().required(),
    role: Joi.string().valid('student', 'supervisor', 'admin').required()
  }).required(),
  participants: Joi.array().items(
    Joi.object({
      userId: Joi.string().required(),
      role: Joi.string().valid('required', 'optional').default('required'),
      response: Joi.string().valid('pending', 'accepted', 'declined', 'tentative').default('pending')
    })
  ).min(1).required(),
  recurrence: Joi.object({
    frequency: Joi.string().valid('none', 'daily', 'weekly', 'biweekly', 'monthly').default('none'),
    interval: Joi.number().min(1).default(1),
    until: Joi.date().greater(Joi.ref('startTime')).optional(),
    daysOfWeek: Joi.when('frequency', {
      is: Joi.valid('weekly', 'biweekly'),
      then: Joi.array().items(Joi.number().min(0).max(6)).required()
    })
  }).default({ frequency: 'none' }),
  reminders: Joi.array().items(
    Joi.object({
      type: Joi.string().valid('email', 'notification', 'both').required(),
      beforeMinutes: Joi.number().valid(5, 10, 15, 30, 60, 1440).required()
    })
  ).optional(),
  attachments: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      url: Joi.string().uri().required(),
      type: Joi.string().required(),
      size: Joi.number().required()
    })
  ).optional(),
  metadata: Joi.object({
    projectId: Joi.string().optional(),
    teamId: Joi.string().optional(),
    sessionId: Joi.string().optional(),
    priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
    tags: Joi.array().items(Joi.string()).optional()
  }).optional()
});

// Meeting schedule validation schema
export const meetingScheduleSchema = Joi.object({
  type: Joi.string().valid(
    'team_meeting',
    'supervision',
    'presentation',
    'evaluation',
    'other'
  ).required(),
  preferredTimes: Joi.array().items(
    Joi.object({
      date: Joi.date().required(),
      slots: Joi.array().items(
        Joi.object({
          startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
          endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required()
        })
      ).min(1).required()
    })
  ).min(1).required(),
  duration: Joi.number().min(15).max(180).required(), // in minutes
  participants: Joi.array().items(
    Joi.object({
      userId: Joi.string().required(),
      role: Joi.string().valid('organizer', 'required', 'optional').required()
    })
  ).min(2).required(),
  location: Joi.alternatives().try(
    Joi.string().valid('online', 'in_person', 'hybrid').required(),
    Joi.object({
      type: Joi.string().valid('online', 'in_person', 'hybrid').required(),
      details: Joi.object().required()
    })
  ),
  agenda: Joi.array().items(
    Joi.object({
      topic: Joi.string().required(),
      duration: Joi.number().required(),
      presenter: Joi.string().optional()
    })
  ).optional(),
  recurring: Joi.object({
    pattern: Joi.string().valid('weekly', 'biweekly', 'monthly').required(),
    count: Joi.number().min(1).max(12).required(),
    daysOfWeek: Joi.array().items(Joi.number().min(0).max(6)).required()
  }).optional()
});

// Office hours schedule validation schema
export const officeHoursSchema = Joi.object({
  supervisorId: Joi.string().required(),
  semester: Joi.string().required(),
  regularHours: Joi.array().items(
    Joi.object({
      day: Joi.number().min(0).max(6).required(),
      slots: Joi.array().items(
        Joi.object({
          startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
          endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
          location: Joi.string().required(),
          type: Joi.string().valid('in_person', 'online', 'both').required()
        })
      ).required()
    })
  ).required(),
  exceptions: Joi.array().items(
    Joi.object({
      date: Joi.date().required(),
      type: Joi.string().valid('cancelled', 'modified').required(),
      reason: Joi.string().required(),
      alternativeSlots: Joi.when('type', {
        is: 'modified',
        then: Joi.array().items(
          Joi.object({
            startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
            endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
            location: Joi.string().required()
          })
        ).required()
      })
    })
  ).optional(),
  bookingConfig: Joi.object({
    slotDuration: Joi.number().valid(15, 30, 45, 60).default(30),
    maxBookingsPerStudent: Joi.number().min(1).default(1),
    minNoticeHours: Joi.number().min(1).default(24),
    maxNoticeHours: Joi.number().min(Joi.ref('minNoticeHours')).default(168), // 1 week
    requireDescription: Joi.boolean().default(true),
    autoConfirm: Joi.boolean().default(false)
  }).required()
});

// Time slot booking validation schema
export const slotBookingSchema = Joi.object({
  slotId: Joi.string().required(),
  studentId: Joi.string().required(),
  projectId: Joi.string().optional(),
  teamId: Joi.string().optional(),
  purpose: Joi.string().valid(
    'project_discussion',
    'technical_help',
    'review_feedback',
    'general_guidance',
    'other'
  ).required(),
  description: Joi.string().min(10).max(500).required(),
  participants: Joi.array().items(
    Joi.string() // additional team members
  ).optional(),
  preferences: Joi.object({
    meetingMode: Joi.string().valid('in_person', 'online', 'no_preference').default('no_preference'),
    notificationPreference: Joi.string().valid('email', 'push', 'both').default('both')
  }).optional()
});

// Schedule conflict check validation schema
export const scheduleConflictSchema = Joi.object({
  participants: Joi.array().items(Joi.string()).min(1).required(),
  timeRanges: Joi.array().items(
    Joi.object({
      startTime: Joi.date().required(),
      endTime: Joi.date().greater(Joi.ref('startTime')).required()
    })
  ).required(),
  checkType: Joi.string().valid(
    'exact',    // Check exact time conflicts
    'buffer',   // Include buffer time
    'preferred' // Check against preferred times
  ).default('exact'),
  bufferMinutes: Joi.when('checkType', {
    is: 'buffer',
    then: Joi.number().min(5).max(60).required()
  }),
  excludeEvents: Joi.array().items(Joi.string()).optional() // Event IDs to exclude
});