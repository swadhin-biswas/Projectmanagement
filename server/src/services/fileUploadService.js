import supabase from '../config/supabase.js';
import logger from '../utils/logger.js';
import { validateFileSize, validateMimeType } from '../validators/teamValidator.js';

const BUCKET_NAME = 'team-chat-attachments';

// Ensure the bucket exists
const initializeBucket = async () => {
  const { data: bucket, error } = await supabase.storage.getBucket(BUCKET_NAME);

  if (error && error.message.includes('not found')) {
    const { data, error: createError } = await supabase.storage.createBucket(
      BUCKET_NAME,
      {
        public: false,
        fileSizeLimit: 5242880 // 5MB
      }
    );

    if (createError) {
      logger.error('Error creating storage bucket:', createError);
      throw createError;
    }
  } else if (error) {
    logger.error('Error checking storage bucket:', error);
    throw error;
  }
};

// Initialize bucket on service startup
initializeBucket().catch(error => {
  logger.error('Failed to initialize storage bucket:', error);
});

export const uploadFile = async (file, userId) => {
  try {
    // Validate file
    if (!validateMimeType(file.mimetype)) {
      throw new Error('Invalid file type');
    }

    if (!validateFileSize(file.size)) {
      throw new Error('File size exceeds limit');
    }

    // Generate a unique file path
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = file.originalname.split('.').pop();
    const filePath = `${userId}/${timestamp}_${randomString}.${extension}`;

    // Upload to Supabase
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600'
      });

    if (error) {
      logger.error('Error uploading file:', error);
      throw error;
    }

    // Get the public URL with a signed expiry
    const { data: { publicUrl }, error: urlError } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, 7 * 24 * 60 * 60); // 7 days expiry

    if (urlError) {
      logger.error('Error generating signed URL:', urlError);
      throw urlError;
    }

    return {
      url: publicUrl,
      type: file.mimetype.startsWith('image/') ? 'image' : 'file',
      name: file.originalname,
      size: file.size
    };
  } catch (error) {
    logger.error('File upload error:', error);
    throw error;
  }
};

export const deleteFile = async (url, userId) => {
  try {
    // Extract the file path from the URL
    const urlObj = new URL(url);
    const fullPath = decodeURIComponent(urlObj.pathname.split('/').pop());

    if (!fullPath) {
      throw new Error('Invalid file URL');
    }

    // Validate that the file belongs to the user
    if (!fullPath.startsWith(`${userId}/`)) {
      throw new Error('Unauthorized to delete this file');
    }

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([fullPath]);

    if (error) {
      logger.error('Error deleting file:', error);
      throw error;
    }

    return true;
  } catch (error) {
    logger.error('File deletion error:', error);
    throw error;
  }
};

export const refreshFileUrl = async (url, userId) => {
  try {
    // Extract the file path from the URL
    const urlObj = new URL(url);
    const fullPath = decodeURIComponent(urlObj.pathname.split('/').pop());

    if (!fullPath) {
      throw new Error('Invalid file URL');
    }

    // Validate that the file belongs to the user
    if (!fullPath.startsWith(`${userId}/`)) {
      throw new Error('Unauthorized to access this file');
    }

    // Generate a new signed URL
    const { data: { publicUrl }, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(fullPath, 7 * 24 * 60 * 60); // 7 days expiry

    if (error) {
      logger.error('Error refreshing signed URL:', error);
      throw error;
    }

    return publicUrl;
  } catch (error) {
    logger.error('URL refresh error:', error);
    throw error;
  }
};