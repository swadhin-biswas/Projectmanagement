import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { api } from '../lib/api';
import { useFileUpload } from './useFileUpload';

export const useTeamChat = (teamId) => {
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const lastMessageTimestamp = useRef(null);
  const typingTimeoutRef = useRef(null);

  const { socket } = useWebSocket();
  const { user } = useAuth();
  const { uploadFile, deleteFile } = useFileUpload();

  // Join team chat room on mount
  useEffect(() => {
    if (!socket || !teamId) return;

    socket.emit('team:join', teamId);
    return () => {
      socket.emit('team:leave', teamId);
    };
  }, [socket, teamId]);

  // Fetch initial messages
  const fetchMessages = useCallback(async (before = null) => {
    try {
      setIsLoading(true);
      const params = { limit: 50 };
      if (before) params.before = before;

      const response = await api.get(`/teams/${teamId}/chat`, { params });

      if (response.data.success) {
        const newMessages = response.data.data;
        setMessages(prev => {
          const uniqueMessages = before ? [...prev, ...newMessages] : newMessages;
          return Array.from(
            new Map(uniqueMessages.map(m => [m._id, m])).values()
          ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        });

        setHasMore(newMessages.length === 50);
        if (newMessages.length > 0) {
          lastMessageTimestamp.current = newMessages[newMessages.length - 1].timestamp;
        }
      }
    } catch (error) {
      toast.error('Failed to load messages');
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [teamId]);

  // Load more messages for infinite scroll
  const loadMoreMessages = useCallback(async () => {
    if (!hasMore || isLoading || !lastMessageTimestamp.current) return;
    await fetchMessages(lastMessageTimestamp.current);
  }, [fetchMessages, hasMore, isLoading]);

  // Send a new message
  const sendMessage = useCallback(async ({ content, isAnnouncement = false, files = [] }) => {
    try {
      let attachments = [];
      if (files.length > 0) {
        // Upload files first
        attachments = await Promise.all(
          files.map(file => uploadFile(file))
        );
      }

      const messageData = {
        content: content.trim(),
        isAnnouncement,
        attachments
      };

      const response = await api.post(`/teams/${teamId}/chat`, messageData);

      if (response.data.success) {
        const newMessage = {
          ...response.data.data,
          sender: {
            _id: user.id,
            fullName: user.fullName
          },
          status: 'sent'
        };

        setMessages(prev => [newMessage, ...prev]);
        socket.emit('team:message', {
          teamId,
          ...messageData
        });
      }
    } catch (error) {
      toast.error('Failed to send message');
      // Clean up uploaded files if message fails
      if (error.attachments) {
        await Promise.all(
          error.attachments.map(file => deleteFile(file.url))
        );
      }
      throw error;
    }
  }, [teamId, user, socket, uploadFile, deleteFile]);

  // Handle typing indicator
  const handleTyping = useCallback((isTyping) => {
    if (!socket) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    socket.emit('team:typing', { teamId, isTyping });

    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('team:typing', { teamId, isTyping: false });
      }, 5000);
    }
  }, [socket, teamId]);

  // Mark messages as read
  const markAsRead = useCallback(async (messageIds) => {
    try {
      await api.post(`/teams/${teamId}/chat/mark-read`, { messageIds });

      if (socket) {
        messageIds.forEach(messageId => {
          socket.emit('team:markRead', { teamId, messageId });
        });
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [teamId, socket]);

  // Handle real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      setMessages(prev => [message, ...prev]);
    };

    const handleMessageRead = ({ messageId, userId, timestamp }) => {
      setMessages(prev =>
        prev.map(msg =>
          msg._id === messageId
            ? {
                ...msg,
                readBy: [...new Set([...msg.readBy, userId])]
              }
            : msg
        )
      );
    };

    const handleTypingStatus = ({ users }) => {
      setTypingUsers(users);
    };

    socket.on('team:message', handleNewMessage);
    socket.on('team:messageRead', handleMessageRead);
    socket.on('team:userTyping', handleTypingStatus);

    return () => {
      socket.off('team:message', handleNewMessage);
      socket.off('team:messageRead', handleMessageRead);
      socket.off('team:userTyping', handleTypingStatus);
    };
  }, [socket]);

  // Load initial messages
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Auto mark messages as read
  useEffect(() => {
    const unreadMessages = messages
      .filter(m => !m.readBy.includes(user.id))
      .map(m => m._id);

    if (unreadMessages.length > 0) {
      markAsRead(unreadMessages);
    }
  }, [messages, user.id, markAsRead]);

  return {
    messages,
    sendMessage,
    loadMoreMessages,
    hasMore,
    isLoading,
    typingUsers,
    handleTyping,
    markAsRead
  };
};
