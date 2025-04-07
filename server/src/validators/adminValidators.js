import Joi from 'joi';

// System configuration validation schema
export const systemConfigSchema = Joi.object({
  academicYear: Joi.object({
    current: Joi.string().required().pattern(/^\d{4}(-\d{4})?$/),
    nextYear: Joi.string().pattern(/^\d{4}(-\d{4})?$/),
    terms: Joi.array().items(
      Joi.string().valid('fall', 'spring', 'summer', 'winter')
    ).required()
  }).required(),
  departments: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      code: Joi.string().required(),
      isActive: Joi.boolean().default(true)
    })
  ).required(),
  projectTypes: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      description: Joi.string().required(),
      isActive: Joi.boolean().default(true)
    })
  ).required(),
  maxProjectsPerSupervisor: Joi.number().min(1).default(5),
  maxTeamSize: Joi.number().min(2).max(6).default(4),
  minTeamSize: Joi.number().min(1).max(4).default(2),
  submissionSettings: Joi.object({
    allowLateSubmissions: Joi.boolean().default(false),
    maxLateSubmissionDays: Joi.number().min(0).default(0),
    latePenaltyPerDay: Joi.number().min(0).max(100).default(10)
  }).required(),
  emailNotifications: Joi.object({
    enabled: Joi.boolean().default(true),
    fromEmail: Joi.string().email().required(),
    adminEmails: Joi.array().items(Joi.string().email()).required(),
    templates: Joi.object({
      welcome: Joi.string().required(),
      projectApproval: Joi.string().required(),
      deadlineReminder: Joi.string().required(),
      gradeRelease: Joi.string().required()
    }).required()
  }).required()
});

// User management validation schema
export const userManagementSchema = Joi.object({
  action: Joi.string().valid('activate', 'deactivate', 'promote', 'restrict').required(),
  userId: Joi.string().required(),
  reason: Joi.string().when('action', {
    is: Joi.valid('deactivate', 'restrict'),
    then: Joi.string().required().min(10)
  }),
  newRole: Joi.string().when('action', {
    is: 'promote',
    then: Joi.string().valid('supervisor', 'admin').required()
  }),
  restrictions: Joi.when('action', {
    is: 'restrict',
    then: Joi.array().items(
      Joi.string().valid('chat', 'submission', 'team_creation')
    ).required()
  })
});

// Bulk user import validation schema
export const bulkUserImportSchema = Joi.object({
  users: Joi.array().items(
    Joi.object({
      fullName: Joi.string().required(),
      email: Joi.string().email().required(),
      role: Joi.string().valid('student', 'supervisor').required(),
      department: Joi.string().required(),
      studentId: Joi.when('role', {
        is: 'student',
        then: Joi.string().pattern(/^[0-9]{8}$/).required()
      }),
      semester: Joi.when('role', {
        is: 'student',
        then: Joi.number().required()
      })
    })
  ).min(1).required(),
  sendInvitations: Joi.boolean().default(true),
  defaultPassword: Joi.string().min(8).required()
});

// Analytics configuration schema
export const analyticsConfigSchema = Joi.object({
  enabledMetrics: Joi.array().items(
    Joi.string().valid(
      'user_activity',
      'submission_stats',
      'team_performance',
      'supervisor_load',
      'project_progress',
      'system_usage'
    )
  ).required(),
  reportingFrequency: Joi.object({
    daily: Joi.array().items(Joi.string()),
    weekly: Joi.array().items(Joi.string()),
    monthly: Joi.array().items(Joi.string())
  }).required(),
  retentionPeriod: Joi.object({
    activityLogs: Joi.number().min(30).default(90),
    systemMetrics: Joi.number().min(90).default(365),
    userMetrics: Joi.number().min(90).default(365)
  }).required(),
  alertThresholds: Joi.object({
    systemLoad: Joi.number().min(50).max(100).default(80),
    errorRate: Joi.number().min(1).max(100).default(5),
    responseTime: Joi.number().min(100).default(1000)
  }).required()
});

// Backup configuration schema
export const backupConfigSchema = Joi.object({
  schedule: Joi.object({
    frequency: Joi.string().valid('daily', 'weekly', 'monthly').required(),
    time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    daysOfWeek: Joi.when('frequency', {
      is: 'weekly',
      then: Joi.array().items(
        Joi.number().min(0).max(6)
      ).required()
    }),
    dayOfMonth: Joi.when('frequency', {
      is: 'monthly',
      then: Joi.number().min(1).max(31).required()
    })
  }).required(),
  retention: Joi.object({
    count: Joi.number().min(1).required(),
    days: Joi.number().min(1).required()
  }).required(),
  storage: Joi.object({
    type: Joi.string().valid('local', 's3', 'gcs').required(),
    path: Joi.when('type', {
      is: 'local',
      then: Joi.string().required()
    }),
    credentials: Joi.when('type', {
      is: Joi.valid('s3', 'gcs'),
      then: Joi.object().required()
    })
  }).required(),
  notification: Joi.object({
    onSuccess: Joi.boolean().default(true),
    onFailure: Joi.boolean().default(true),
    recipients: Joi.array().items(Joi.string().email()).required()
  }).required()
});