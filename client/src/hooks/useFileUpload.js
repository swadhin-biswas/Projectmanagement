import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '../lib/api';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
];

export const useFileUpload = () => {
  const [isUploading, setIsUploading] = useState(false);

  const validateFile = (file) => {
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('File size must be less than 5MB');
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error('File type not supported');
    }

    return true;
  };

  const uploadFile = async (file) => {
    try {
      setIsUploading(true);

      // Validate file before upload
      validateFile(file);

      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/api/uploads', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Upload failed');
      }

      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.error || error.message;
      toast.error(`Upload failed: ${message}`);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const uploadFiles = async (files) => {
    try {
      // Validate all files first
      const validFiles = Array.from(files).filter(file => {
        try {
          validateFile(file);
          return true;
        } catch (error) {
          toast.error(`${file.name}: ${error.message}`);
          return false;
        }
      });

      if (validFiles.length === 0) {
        return [];
      }

      // Upload all valid files in parallel
      const uploadPromises = validFiles.map(uploadFile);
      const results = await Promise.allSettled(uploadPromises);

      // Process results
      const successfulUploads = results
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value);

      const failedUploads = results
        .filter(result => result.status === 'rejected')
        .length;

      if (failedUploads > 0) {
        toast.error(`${failedUploads} file(s) failed to upload`);
      }

      if (successfulUploads.length > 0) {
        toast.success(`Successfully uploaded ${successfulUploads.length} file(s)`);
      }

      return successfulUploads;
    } catch (error) {
      toast.error('Failed to upload files');
      throw error;
    }
  };

  const deleteFile = async (url) => {
    try {
      const encodedUrl = encodeURIComponent(url);
      const response = await api.delete(`/api/uploads/${encodedUrl}`);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Delete failed');
      }

      return true;
    } catch (error) {
      const message = error.response?.data?.error || error.message;
      toast.error(`Delete failed: ${message}`);
      throw error;
    }
  };

  return {
    uploadFile,
    uploadFiles,
    deleteFile,
    isUploading
  };
};