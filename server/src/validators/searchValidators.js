import Joi from 'joi';

// Base search validation schema
export const baseSearchSchema = Joi.object({
  query: Joi.string().min(2).required(),
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(10),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  includeArchived: Joi.boolean().default(false)
});

// Project search validation schema
export const projectSearchSchema = baseSearchSchema.keys({
  filters: Joi.object({
    type: Joi.array().items(
      Joi.string().valid('research_based', 'project_based')
    ).optional(),
    status: Joi.array().items(
      Joi.string().valid('pending', 'active', 'completed', 'archived')
    ).optional(),
    department: Joi.array().items(Joi.string()).optional(),
    supervisor: Joi.string().optional(),
    session: Joi.string().optional(),
    dateRange: Joi.object({
      start: Joi.date().optional(),
      end: Joi.date().greater(Joi.ref('start')).optional()
    }).optional(),
    technologies: Joi.array().items(Joi.string()).optional(),
    progress: Joi.object({
      min: Joi.number().min(0).max(100).optional(),
      max: Joi.number().min(0).max(100).greater(Joi.ref('min')).optional()
    }).optional()
  }).optional()
});

// Team search validation schema
export const teamSearchSchema = baseSearchSchema.keys({
  filters: Joi.object({
    status: Joi.array().items(
      Joi.string().valid('forming', 'active', 'completed')
    ).optional(),
    session: Joi.string().optional(),
    supervisor: Joi.string().optional(),
    memberCount: Joi.object({
      min: Joi.number().min(1).optional(),
      max: Joi.number().min(Joi.ref('min')).optional()
    }).optional(),
    department: Joi.array().items(Joi.string()).optional(),
    projectType: Joi.array().items(Joi.string()).optional()
  }).optional()
});

// User search validation schema
export const userSearchSchema = baseSearchSchema.keys({
  filters: Joi.object({
    role: Joi.array().items(
      Joi.string().valid('student', 'supervisor', 'admin')
    ).optional(),
    department: Joi.array().items(Joi.string()).optional(),
    status: Joi.array().items(
      Joi.string().valid('active', 'inactive', 'pending')
    ).optional(),
    semester: Joi.number().optional(),
    expertise: Joi.array().items(Joi.string()).optional(),
    registrationDate: Joi.object({
      start: Joi.date().optional(),
      end: Joi.date().greater(Joi.ref('start')).optional()
    }).optional()
  }).optional()
});

// Document search validation schema
export const documentSearchSchema = baseSearchSchema.keys({
  filters: Joi.object({
    type: Joi.array().items(
      Joi.string().valid(
        'proposal',
        'progress_report',
        'final_report',
        'presentation',
        'technical_document'
      )
    ).optional(),
    status: Joi.array().items(
      Joi.string().valid('draft', 'under_review', 'approved', 'rejected')
    ).optional(),
    author: Joi.string().optional(),
    dateRange: Joi.object({
      start: Joi.date().optional(),
      end: Joi.date().greater(Joi.ref('start')).optional()
    }).optional(),
    team: Joi.string().optional(),
    project: Joi.string().optional(),
    tags: Joi.array().items(Joi.string()).optional()
  }).optional()
});

// Advanced search validation schema
export const advancedSearchSchema = Joi.object({
  searchType: Joi.string().valid(
    'full_text',
    'semantic',
    'fuzzy'
  ).default('full_text'),
  query: Joi.string().min(2).required(),
  scope: Joi.array().items(
    Joi.string().valid(
      'projects',
      'teams',
      'users',
      'documents',
      'submissions',
      'comments'
    )
  ).required(),
  filters: Joi.object({
    dateRange: Joi.object({
      start: Joi.date().optional(),
      end: Joi.date().greater(Joi.ref('start')).optional()
    }).optional(),
    status: Joi.array().items(Joi.string()).optional(),
    department: Joi.array().items(Joi.string()).optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    customFields: Joi.object().pattern(
      Joi.string(),
      Joi.alternatives().try(
        Joi.string(),
        Joi.number(),
        Joi.boolean(),
        Joi.array().items(Joi.string())
      )
    ).optional()
  }).optional(),
  pagination: Joi.object({
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(10)
  }).required(),
  sorting: Joi.object({
    field: Joi.string().required(),
    order: Joi.string().valid('asc', 'desc').default('desc')
  }).optional(),
  options: Joi.object({
    highlightResults: Joi.boolean().default(false),
    includeArchived: Joi.boolean().default(false),
    exactMatch: Joi.boolean().default(false),
    caseSensitive: Joi.boolean().default(false)
  }).optional()
});