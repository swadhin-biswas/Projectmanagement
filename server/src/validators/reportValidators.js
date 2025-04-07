import Joi from 'joi';

// Report generation validation schema
export const reportGenerationSchema = Joi.object({
  reportType: Joi.string().valid(
    'project_progress',
    'team_performance',
    'student_evaluation',
    'supervisor_workload',
    'submission_analytics',
    'system_usage',
    'custom'
  ).required(),
  timeframe: Joi.object({
    start: Joi.date().required(),
    end: Joi.date().greater(Joi.ref('start')).required()
  }).required(),
  filters: Joi.object({
    departments: Joi.array().items(Joi.string()).optional(),
    sessions: Joi.array().items(Joi.string()).optional(),
    projectTypes: Joi.array().items(Joi.string()).optional(),
    supervisors: Joi.array().items(Joi.string()).optional(),
    status: Joi.array().items(Joi.string()).optional()
  }).optional(),
  metrics: Joi.array().items(
    Joi.string().valid(
      'completion_rate',
      'average_grade',
      'submission_timeliness',
      'feedback_quality',
      'team_collaboration',
      'project_milestones',
      'resource_utilization'
    )
  ).optional(),
  groupBy: Joi.array().items(
    Joi.string().valid(
      'department',
      'session',
      'supervisor',
      'project_type',
      'team',
      'date'
    )
  ).optional(),
  format: Joi.string().valid('pdf', 'excel', 'csv', 'json').default('pdf'),
  includeCharts: Joi.boolean().default(true),
  customFields: Joi.when('reportType', {
    is: 'custom',
    then: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        type: Joi.string().valid('numeric', 'categorical', 'boolean', 'date').required(),
        aggregation: Joi.string().valid('sum', 'average', 'count', 'distinct').required()
      })
    ).required()
  })
});

// Analytics dashboard configuration schema
export const dashboardConfigSchema = Joi.object({
  layout: Joi.array().items(
    Joi.object({
      id: Joi.string().required(),
      type: Joi.string().valid('chart', 'metric', 'table', 'list').required(),
      position: Joi.object({
        x: Joi.number().min(0).required(),
        y: Joi.number().min(0).required(),
        width: Joi.number().min(1).max(12).required(),
        height: Joi.number().min(1).required()
      }).required(),
      settings: Joi.object({
        title: Joi.string().required(),
        description: Joi.string().optional(),
        refreshInterval: Joi.number().min(0).default(0),
        dataSource: Joi.string().required(),
        visualization: Joi.object({
          type: Joi.string().valid(
            'line',
            'bar',
            'pie',
            'scatter',
            'table',
            'number'
          ).required(),
          options: Joi.object().optional()
        }).required()
      }).required()
    })
  ).required(),
  filters: Joi.object({
    timeRange: Joi.object({
      enabled: Joi.boolean().default(true),
      defaultPeriod: Joi.string().valid(
        'today',
        'week',
        'month',
        'quarter',
        'year',
        'custom'
      ).default('week')
    }).optional(),
    departments: Joi.boolean().default(true),
    sessions: Joi.boolean().default(true),
    projectTypes: Joi.boolean().default(true)
  }).optional(),
  preferences: Joi.object({
    theme: Joi.string().valid('light', 'dark', 'system').default('system'),
    autoRefresh: Joi.boolean().default(false),
    defaultView: Joi.string().valid('overview', 'detailed').default('overview')
  }).optional()
});

// Performance metric validation schema
export const performanceMetricSchema = Joi.object({
  metricType: Joi.string().valid(
    'project_completion',
    'submission_quality',
    'team_collaboration',
    'supervisor_responsiveness',
    'resource_usage',
    'user_engagement'
  ).required(),
  value: Joi.number().required(),
  timestamp: Joi.date().default(Date.now),
  context: Joi.object({
    entityType: Joi.string().valid(
      'project',
      'team',
      'user',
      'session',
      'system'
    ).required(),
    entityId: Joi.string().required(),
    metadata: Joi.object().optional()
  }).required(),
  comparison: Joi.object({
    previousValue: Joi.number().optional(),
    targetValue: Joi.number().optional(),
    trend: Joi.string().valid('increasing', 'decreasing', 'stable').optional()
  }).optional()
});

// Custom report template validation schema
export const reportTemplateSchema = Joi.object({
  name: Joi.string().required().min(3).max(100),
  description: Joi.string().optional().max(500),
  type: Joi.string().valid(
    'project',
    'team',
    'student',
    'supervisor',
    'system'
  ).required(),
  sections: Joi.array().items(
    Joi.object({
      title: Joi.string().required(),
      content: Joi.array().items(
        Joi.object({
          type: Joi.string().valid(
            'text',
            'table',
            'chart',
            'metric',
            'custom'
          ).required(),
          data: Joi.object({
            source: Joi.string().required(),
            query: Joi.object().required(),
            transformation: Joi.string().optional()
          }).required(),
          style: Joi.object().optional()
        })
      ).required()
    })
  ).required(),
  scheduling: Joi.object({
    frequency: Joi.string().valid(
      'daily',
      'weekly',
      'monthly',
      'quarterly'
    ).optional(),
    recipients: Joi.array().items(
      Joi.object({
        email: Joi.string().email().required(),
        role: Joi.string().valid('to', 'cc', 'bcc').default('to')
      })
    ).optional()
  }).optional()
});