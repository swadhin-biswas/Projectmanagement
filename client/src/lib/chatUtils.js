import { v4 as uuidv4 } from 'uuid';

// Message types
export const MESSAGE_TYPES = {
  TEXT: 'text',
  FILE: 'file',
  IMAGE: 'image',
  ANNOUNCEMENT: 'announcement',
  SYSTEM: 'system'
};

// Format chat timestamps
export const formatChatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInHours = (now - date) / (1000 * 60 * 60);

  if (diffInHours < 24) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffInHours < 48) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric'
    });
  }
};

// Format timestamp for display
export const formatMessageTime = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffInDays === 1) {
    return 'Yesterday ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffInDays < 7) {
    return date.toLocaleDateString([], { weekday: 'long' });
  } else {
    return date.toLocaleDateString();
  }
};

// Generate a temporary local ID for optimistic updates
export const generateLocalId = () => `local_${uuidv4()}`;

// Process attachments before sending
export const processAttachments = async (files) => {
  return Promise.all(files.map(async (file) => {
    const isImage = file.type.startsWith('image/');
    let preview = null;

    if (isImage) {
      preview = await createImagePreview(file);
    }

    return {
      id: generateLocalId(),
      name: file.name,
      type: file.type,
      size: file.size,
      preview,
      file
    };
  }));
};

// Create image preview for attachments
const createImagePreview = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.readAsDataURL(file);
  });
};

// Format file size for display
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Group chat messages by date
export const groupMessagesByDate = (messages) => {
  const groups = new Map();

  messages.forEach(message => {
    const date = new Date(message.timestamp).toLocaleDateString();
    if (!groups.has(date)) {
      groups.set(date, []);
    }
    groups.get(date).push(message);
  });

  return Array.from(groups.entries())
    .sort((a, b) => new Date(b[0]) - new Date(a[0]))
    .map(([date, messages]) => ({
      date,
      messages: messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    }));
};

// Check if message is from same sender as previous
export const isConsecutiveMessage = (currentMsg, prevMsg) => {
  if (!prevMsg) return false;

  const timeDiff = new Date(currentMsg.timestamp) - new Date(prevMsg.timestamp);
  const isWithin5Mins = timeDiff < 5 * 60 * 1000;

  return currentMsg.sender._id === prevMsg.sender._id && isWithin5Mins;
};

// Check if a message needs to show sender info
export const shouldShowSender = (message, prevMessage) => {
  if (!prevMessage) return true;

  const timeDiff = new Date(message.timestamp) - new Date(prevMessage.timestamp);
  const isNewSender = message.sender._id !== prevMessage.sender._id;

  return isNewSender || timeDiff > 5 * 60 * 1000; // Show sender if >5 min gap
};

// Get message status icon
export const getMessageStatusIcon = (message) => {
  if (message.error) return '❌';
  if (message.status === 'sending') return '⏳';
  if (message.status === 'sent') return '✓';
  if (message.readBy?.length > 0) return '✓✓';
  return '';
};

// Get message status text
export const getMessageStatus = (message) => {
  if (message.error) return 'Failed to send';
  if (message.localId) return 'Sending...';
  if (message.readBy?.length === 0) return 'Sent';
  return `Read by ${message.readBy.length}`;
};

// Format file size
export const formatFileSizeOld = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

// Validate file upload
export const validateFileUpload = (file) => {
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];

  if (file.size > MAX_SIZE) {
    throw new Error('File size must be less than 5MB');
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('File type not supported');
  }

  return true;
};

// Handle file upload with progress
export const uploadFile = async (file, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress?.(percentCompleted);
      }
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error('File upload error:', error);
    throw error;
  }
};

// Generate placeholder image from user name
export const generateAvatarPlaceholder = (name) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase();
};

// Message forwarding utilities
export const prepareMessageForForwarding = (message) => {
  const {
    content,
    attachments,
    isAnnouncement,
    sender,
    timestamp,
    ...rest
  } = message;

  // Create a new metadata object for forwarded messages
  const forwardMetadata = {
    originalSender: sender.fullName,
    originalTeam: rest.teamName,
    forwardedAt: new Date().toISOString(),
    originalTimestamp: timestamp
  };

  return {
    content,
    attachments: attachments || [],
    isAnnouncement: false, // Forwarded messages are never announcements
    forwardMetadata
  };
};

// Format message metadata for display
export const formatMessageMetadata = (message) => {
  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };

  const timestamp = new Date(message.timestamp).toLocaleString(
    undefined,
    options
  );

  if (message.forwardMetadata) {
    const originalDate = new Date(
      message.forwardMetadata.originalTimestamp
    ).toLocaleString(undefined, options);

    return {
      primary: `Forwarded from ${message.forwardMetadata.originalTeam}`,
      secondary: `Originally sent by ${message.forwardMetadata.originalSender} at ${originalDate}`,
      timestamp
    };
  }

  return {
    primary: message.sender.fullName,
    secondary: message.isAnnouncement ? '📢 Announcement' : '',
    timestamp
  };
};

// Format message content (handle mentions, links, etc.)
export const formatMessageContent = (content) => {
  return content
    // Handle user mentions
    .replace(/@(\w+)/g, '<mention>$1</mention>')
    // Convert URLs to links
    .replace(
      /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    )
    // Handle markdown-style bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Handle markdown-style italic
    .replace(/\_(.*?)\_/g, '<em>$1</em>');
};

// Get file preview details
export const getFilePreviewDetails = (attachment) => {
  const isImage = attachment.type === 'image';
  const extension = attachment.name.split('.').pop()?.toLowerCase();

  // Format file size
  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Get icon and color based on file type
  const getFileTypeDetails = () => {
    switch (extension) {
      case 'pdf':
        return { icon: 'file-text', color: 'text-red-500' };
      case 'doc':
      case 'docx':
        return { icon: 'file-text', color: 'text-blue-500' };
      case 'txt':
        return { icon: 'file', color: 'text-gray-500' };
      default:
        return { icon: 'paperclip', color: 'text-gray-500' };
    }
  };

  return {
    isImage,
    fileType: extension,
    formattedSize: formatSize(attachment.size),
    ...(!isImage && getFileTypeDetails())
  };
};

// Check if a URL has expired
export const isUrlExpired = (url) => {
  try {
    const urlObj = new URL(url);
    const expiryParam = urlObj.searchParams.get('expires');
    if (!expiryParam) return false;

    const expiryTimestamp = parseInt(expiryParam, 10) * 1000;
    return Date.now() >= expiryTimestamp;
  } catch {
    return false;
  }
};

// Store messages in IndexedDB for offline access
export const storeMessages = async (messages, db) => {
  const tx = db.transaction('messages', 'readwrite');
  const store = tx.objectStore('messages');

  await Promise.all(
    messages.map(message => store.put(message))
  );

  await tx.done;
};

// Retrieve messages from IndexedDB
export const retrieveMessages = async (teamId, db) => {
  const tx = db.transaction('messages', 'readonly');
  const store = tx.objectStore('messages');
  const index = store.index('teamId');

  const messages = await index.getAll(IDBKeyRange.only(teamId));
  await tx.done;

  return messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
};

// Clean up old messages from IndexedDB
export const cleanupOldMessages = async (db, daysToKeep = 30) => {
  const tx = db.transaction('messages', 'readwrite');
  const store = tx.objectStore('messages');
  const range = IDBKeyRange.upperBound(
    new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000)
  );

  await store.delete(range);
  await tx.done;
};