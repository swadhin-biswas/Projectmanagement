import Joi from 'joi';

// File upload validation schema
export const fileUploadSchema = Joi.object({
  file: Joi.object({
    originalname: Joi.string().required(),
    mimetype: Joi.string().valid(
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/zip',
      'application/x-zip-compressed',
      'text/plain',
      'application/json',
      'text/markdown',
      'text/csv'
    ).required(),
    size: Joi.number().max(20 * 1024 * 1024).required(), // 20MB max
    buffer: Joi.binary().required()
  }).required(),
  category: Joi.string().valid(
    'project_document',
    'presentation',
    'report',
    'source_code',
    'image',
    'other'
  ).required(),
  relatedTo: Joi.object({
    model: Joi.string().valid('Project', 'Team', 'Submission').required(),
    id: Joi.string().required()
  }).required(),
  description: Joi.string().max(500).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  visibility: Joi.string().valid('public', 'private', 'team', 'supervisor').default('team')
});

// Document metadata validation schema
export const documentMetadataSchema = Joi.object({
  title: Joi.string().required().min(3).max(200),
  documentType: Joi.string().valid(
    'proposal',
    'progress_report',
    'final_report',
    'presentation',
    'technical_document',
    'meeting_minutes',
    'other'
  ).required(),
  version: Joi.string().pattern(/^\d+\.\d+$/).required(),
  authors: Joi.array().items(
    Joi.object({
      userId: Joi.string().required(),
      role: Joi.string().valid('primary', 'contributor').required()
    })
  ).min(1).required(),
  keywords: Joi.array().items(Joi.string()).optional(),
  abstract: Joi.string().max(1000).optional(),
  language: Joi.string().default('en'),
  status: Joi.string().valid(
    'draft',
    'under_review',
    'approved',
    'rejected',
    'archived'
  ).default('draft')
});

// File sharing validation schema
export const fileSharingSchema = Joi.object({
  fileId: Joi.string().required(),
  shareWith: Joi.array().items(
    Joi.alternatives().try(
      Joi.string(), // userId
      Joi.object({
        role: Joi.string().valid('student', 'supervisor', 'admin').required(),
        teamId: Joi.string().optional()
      })
    )
  ).required(),
  permissions: Joi.object({
    read: Joi.boolean().default(true),
    write: Joi.boolean().default(false),
    share: Joi.boolean().default(false),
    download: Joi.boolean().default(true)
  }).required(),
  expiresAt: Joi.date().greater('now').optional(),
  password: Joi.string().min(6).optional(),
  notifyRecipients: Joi.boolean().default(true),
  message: Joi.string().max(500).optional()
});

// Batch file operation validation schema
export const batchFileOperationSchema = Joi.object({
  files: Joi.array().items(Joi.string()).min(1).required(),
  operation: Joi.string().valid(
    'move',
    'copy',
    'delete',
    'archive',
    'share',
    'tag'
  ).required(),
  destination: Joi.when('operation', {
    is: Joi.valid('move', 'copy'),
    then: Joi.string().required()
  }),
  tags: Joi.when('operation', {
    is: 'tag',
    then: Joi.array().items(Joi.string()).required()
  }),
  sharingConfig: Joi.when('operation', {
    is: 'share',
    then: Joi.object({
      recipients: Joi.array().items(Joi.string()).required(),
      permissions: Joi.object({
        read: Joi.boolean().default(true),
        write: Joi.boolean().default(false),
        share: Joi.boolean().default(false)
      }).required()
    }).required()
  })
});

// File storage configuration validation schema
export const storageConfigSchema = Joi.object({
  provider: Joi.string().valid('local', 's3', 'gcs').required(),
  config: Joi.alternatives().conditional('provider', {
    is: 'local',
    then: Joi.object({
      basePath: Joi.string().required(),
      tempPath: Joi.string().required()
    }),
    otherwise: Joi.object({
      bucket: Joi.string().required(),
      region: Joi.string().required(),
      credentials: Joi.object().required()
    })
  }).required(),
  limits: Joi.object({
    maxFileSize: Joi.number().min(1 * 1024 * 1024).required(), // min 1MB
    allowedTypes: Joi.array().items(Joi.string()).required(),
    maxFilesPerUser: Joi.number().min(1).required(),
    totalStoragePerUser: Joi.number().min(50 * 1024 * 1024).required() // min 50MB
  }).required(),
  cleanup: Joi.object({
    enabled: Joi.boolean().default(true),
    tempFileAge: Joi.number().min(1).default(24), // hours
    deletedFileRetention: Joi.number().min(1).default(30) // days
  }).optional()
});