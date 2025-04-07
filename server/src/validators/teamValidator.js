import { z } from 'zod';

// Common schemas
const attachmentSchema = z.object({
  url: z.string().url(),
  type: z.enum(['image', 'file']),
  name: z.string(),
  size: z.number()
});

const messageBaseSchema = z.object({
  content: z.string().min(1).max(5000),
  isAnnouncement: z.boolean().optional().default(false),
  attachments: z.array(attachmentSchema).optional().default([])
});

// Socket event schemas
export const socketEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('team:message'),
    teamId: z.string(),
    content: z.string().min(1).max(5000),
    isAnnouncement: z.boolean().optional(),
    attachments: z.array(attachmentSchema).optional()
  }),
  z.object({
    type: z.literal('team:typing'),
    teamId: z.string(),
    isTyping: z.boolean()
  }),
  z.object({
    type: z.literal('team:markRead'),
    teamId: z.string(),
    messageId: z.string()
  })
]);

// API request schemas
export const createMessageSchema = messageBaseSchema.extend({
  teamId: z.string()
});

export const updateMessageSchema = z.object({
  content: z.string().min(1).max(5000).optional(),
  isAnnouncement: z.boolean().optional()
});

export const markReadSchema = z.object({
  messageIds: z.array(z.string()).min(1)
});

export const fileUploadSchema = z.object({
  file: z.any(),
  userId: z.string()
});

export const fileDeleteSchema = z.object({
  url: z.string().url()
});

// Response schemas
export const messageResponseSchema = z.object({
  _id: z.string(),
  content: z.string(),
  isAnnouncement: z.boolean(),
  attachments: z.array(attachmentSchema).optional(),
  sender: z.object({
    _id: z.string(),
    fullName: z.string()
  }),
  readBy: z.array(z.string()),
  timestamp: z.string().datetime(),
  teamId: z.string()
});

export const messagesResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(messageResponseSchema),
  hasMore: z.boolean().optional()
});

export const uploadResponseSchema = z.object({
  success: z.boolean(),
  data: attachmentSchema.optional(),
  error: z.string().optional()
});

// Validate file mime types
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
];

export const validateMimeType = (mimeType) => {
  return ALLOWED_MIME_TYPES.includes(mimeType);
};

// Validate file size (5MB limit)
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

export const validateFileSize = (size) => {
  return size <= MAX_FILE_SIZE;
};