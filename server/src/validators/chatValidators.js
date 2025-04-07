import Joi from 'joi';

// Chat message validation schema
export const chatMessageSchema = Joi.object({
  content: Joi.string().required().min(1).max(2000),
  type: Joi.string().valid(
    'text',
    'file',
    'code',
    'link',
    'system'
  ).default('text'),
  roomId: Joi.string().required(),
  replyTo: Joi.string().optional(),
  mentions: Joi.array().items(
    Joi.object({
      userId: Joi.string().required(),
      displayName: Joi.string().required()
    })
  ).optional(),
  attachments: Joi.when('type', {
    is: 'file',
    then: Joi.array().items(
      Joi.object({
        fileName: Joi.string().required(),
        fileUrl: Joi.string().uri().required(),
        fileType: Joi.string().required(),
        fileSize: Joi.number().required(),
        thumbnailUrl: Joi.string().uri().optional()
      })
    ).max(5).required()
  }),
  codeSnippet: Joi.when('type', {
    is: 'code',
    then: Joi.object({
      code: Joi.string().required(),
      language: Joi.string().required(),
      title: Joi.string().optional()
    }).required()
  }),
  metadata: Joi.object({
    isEdited: Joi.boolean().default(false),
    editedAt: Joi.date().optional(),
    isPinned: Joi.boolean().default(false),
    isAnnouncement: Joi.boolean().default(false)
  }).default({})
});

// Chat room validation schema
export const chatRoomSchema = Joi.object({
  name: Joi.string().required().min(3).max(100),
  type: Joi.string().valid(
    'team',
    'project',
    'supervisor',
    'direct',
    'group'
  ).required(),
  participants: Joi.array().items(
    Joi.object({
      userId: Joi.string().required(),
      role: Joi.string().valid('admin', 'member').default('member'),
      joinedAt: Joi.date().default(Date.now)
    })
  ).min(2).required(),
  description: Joi.string().max(500).optional(),
  settings: Joi.object({
    isPrivate: Joi.boolean().default(false),
    allowFileSharing: Joi.boolean().default(true),
    allowInvites: Joi.boolean().default(true),
    allowThreads: Joi.boolean().default(true),
    maxFileSize: Joi.number().default(10 * 1024 * 1024), // 10MB
    retentionDays: Joi.number().min(1).default(365)
  }).default({}),
  relatedTo: Joi.object({
    model: Joi.string().valid('Team', 'Project').optional(),
    id: Joi.string().optional()
  }).optional()
});

// Thread message validation schema
export const threadMessageSchema = Joi.object({
  parentMessageId: Joi.string().required(),
  content: Joi.string().required().min(1).max(1000),
  type: Joi.string().valid('text', 'file').default('text'),
  attachments: Joi.when('type', {
    is: 'file',
    then: Joi.array().items(
      Joi.object({
        fileName: Joi.string().required(),
        fileUrl: Joi.string().uri().required(),
        fileType: Joi.string().required(),
        fileSize: Joi.number().required()
      })
    ).max(2).required()
  }),
  mentions: Joi.array().items(
    Joi.object({
      userId: Joi.string().required(),
      displayName: Joi.string().required()
    })
  ).optional()
});

// Chat invite validation schema
export const chatInviteSchema = Joi.object({
  roomId: Joi.string().required(),
  invitees: Joi.array().items(
    Joi.alternatives().try(
      Joi.string(),
      Joi.object({
        userId: Joi.string().required(),
        role: Joi.string().valid('admin', 'member').default('member')
      })
    )
  ).min(1).required(),
  message: Joi.string().max(200).optional(),
  expiresIn: Joi.number().min(300).max(86400).default(3600), // 5min to 24h
  maxUses: Joi.number().min(1).optional()
});

// Message reaction validation schema
export const messageReactionSchema = Joi.object({
  messageId: Joi.string().required(),
  reaction: Joi.string().required().max(2), // emoji
  action: Joi.string().valid('add', 'remove').required()
});

// Chat settings update validation schema
export const chatSettingsUpdateSchema = Joi.object({
  roomId: Joi.string().required(),
  settings: Joi.object({
    notifications: Joi.object({
      muted: Joi.boolean().optional(),
      mentionsOnly: Joi.boolean().optional(),
      muteUntil: Joi.date().greater('now').optional()
    }).optional(),
    displayName: Joi.string().min(1).max(100).optional(),
    theme: Joi.string().valid('light', 'dark', 'system').optional(),
    pinnedMessages: Joi.array().items(Joi.string()).optional()
  }).min(1).required()
});

// Message moderation validation schema
export const messageModerationSchema = Joi.object({
  messageId: Joi.string().required(),
  action: Joi.string().valid(
    'delete',
    'flag',
    'pin',
    'unpin',
    'report'
  ).required(),
  reason: Joi.when('action', {
    is: Joi.valid('flag', 'report'),
    then: Joi.string().required().min(10).max(500)
  }),
  moderatorNote: Joi.string().max(500).optional()
});