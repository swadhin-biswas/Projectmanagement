import Joi from 'joi';

// Audit log entry validation schema
export const auditLogSchema = Joi.object({
  action: Joi.string().valid(
    'create',
    'update',
    'delete',
    'view',
    'login',
    'logout',
    'approve',
    'reject',
    'submit',
    'assign',
    'revoke',
    'import',
    'export',
    'configure'
  ).required(),
  entityType: Joi.string().valid(
    'user',
    'project',
    'team',
    'submission',
    'session',
    'document',
    'notification',
    'setting',
    'system'
  ).required(),
  entityId: Joi.string().required(),
  userId: Joi.string().required(),
  userRole: Joi.string().valid('student', 'supervisor', 'admin').required(),
  timestamp: Joi.date().default(Date.now),
  changes: Joi.alternatives().conditional('action', {
    is: Joi.valid('update', 'configure'),
    then: Joi.object({
      before: Joi.object().required(),
      after: Joi.object().required()
    }).required(),
    otherwise: Joi.object().optional()
  }),
  metadata: Joi.object({
    ipAddress: Joi.string().ip().required(),
    userAgent: Joi.string().required(),
    location: Joi.object({
      country: Joi.string().optional(),
      region: Joi.string().optional(),
      city: Joi.string().optional()
    }).optional(),
    sessionId: Joi.string().optional(),
    deviceInfo: Joi.object().optional()
  }).required(),
  status: Joi.string().valid('success', 'failure', 'pending').required(),
  errorDetails: Joi.when('status', {
    is: 'failure',
    then: Joi.object({
      code: Joi.string().required(),
      message: Joi.string().required(),
      stack: Joi.string().optional()
    }).required()
  })
});

// System monitoring metric validation schema
export const monitoringMetricSchema = Joi.object({
  name: Joi.string().required(),
  type: Joi.string().valid(
    'counter',
    'gauge',
    'histogram',
    'summary'
  ).required(),
  value: Joi.alternatives().conditional('type', {
    is: 'histogram',
    then: Joi.array().items(Joi.number()).required(),
    otherwise: Joi.number().required()
  }),
  labels: Joi.object({
    environment: Joi.string().valid('production', 'staging', 'development').required(),
    service: Joi.string().required(),
    instance: Joi.string().required()
  }).required(),
  timestamp: Joi.date().default(Date.now),
  interval: Joi.string().valid(
    '10s',
    '30s',
    '1m',
    '5m',
    '15m',
    '1h'
  ).default('1m')
});

// Alert configuration validation schema
export const alertConfigSchema = Joi.object({
  name: Joi.string().required().min(3).max(100),
  description: Joi.string().optional().max(500),
  condition: Joi.object({
    metric: Joi.string().required(),
    operator: Joi.string().valid(
      'gt', 'gte', 'lt', 'lte', 'eq', 'neq'
    ).required(),
    threshold: Joi.number().required(),
    duration: Joi.string().pattern(/^\d+[smh]$/).required(), // e.g., "5m", "1h"
    frequency: Joi.string().pattern(/^\d+[smh]$/).required()
  }).required(),
  severity: Joi.string().valid(
    'critical',
    'high',
    'medium',
    'low',
    'info'
  ).required(),
  notifications: Joi.array().items(
    Joi.object({
      type: Joi.string().valid('email', 'slack', 'webhook').required(),
      target: Joi.string().required(),
      template: Joi.string().required()
    })
  ).required(),
  schedule: Joi.object({
    activeHours: Joi.object({
      start: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      end: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    }).optional(),
    timezone: Joi.string().optional(),
    excludeDays: Joi.array().items(
      Joi.number().min(0).max(6)
    ).optional()
  }).optional(),
  aggregation: Joi.object({
    function: Joi.string().valid(
      'avg',
      'sum',
      'min',
      'max',
      'count'
    ).required(),
    groupBy: Joi.array().items(Joi.string()).optional()
  }).optional()
});

// System health check validation schema
export const healthCheckSchema = Joi.object({
  service: Joi.string().required(),
  status: Joi.string().valid('up', 'down', 'degraded').required(),
  timestamp: Joi.date().default(Date.now),
  checks: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      status: Joi.string().valid('pass', 'fail', 'warn').required(),
      timestamp: Joi.date().default(Date.now),
      duration: Joi.number().required(), // milliseconds
      details: Joi.object({
        message: Joi.string().optional(),
        error: Joi.string().optional(),
        metrics: Joi.object().optional()
      }).optional()
    })
  ).required(),
  metrics: Joi.object({
    uptime: Joi.number().required(),
    responseTime: Joi.number().required(),
    cpuUsage: Joi.number().min(0).max(100).required(),
    memoryUsage: Joi.number().min(0).required(),
    activeConnections: Joi.number().min(0).required()
  }).required()
});

// Performance trace validation schema
export const performanceTraceSchema = Joi.object({
  traceId: Joi.string().required(),
  parentId: Joi.string().optional(),
  name: Joi.string().required(),
  type: Joi.string().valid(
    'http',
    'database',
    'cache',
    'external',
    'internal'
  ).required(),
  timestamp: Joi.date().default(Date.now),
  duration: Joi.number().required(), // milliseconds
  status: Joi.string().valid('success', 'error', 'timeout').required(),
  data: Joi.object({
    method: Joi.string().optional(),
    url: Joi.string().optional(),
    query: Joi.string().optional(),
    params: Joi.object().optional(),
    response: Joi.object({
      status: Joi.number().optional(),
      size: Joi.number().optional()
    }).optional()
  }).optional(),
  tags: Joi.object().pattern(
    Joi.string(),
    Joi.alternatives().try(Joi.string(), Joi.number(), Joi.boolean())
  ).optional()
});