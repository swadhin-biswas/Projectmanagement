import { useCallback, useEffect } from 'react';
import { useChatStorage } from '../contexts/ChatStorageContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { api } from '../lib/api';

export const useReadReceipts = (teamId) => {
  const socket = useWebSocket();
  const storage = useChatStorage();

  // Mark messages as read locally
  const markMessagesReadLocally = useCallback(async (messageIds) => {
    const db = await storage.dbPromise;
    const tx = db.transaction('messages', 'readwrite');
    const store = tx.objectStore('messages');

    // Update each message's readBy array
    await Promise.all(messageIds.map(async (messageId) => {
      const message = await store.get(messageId);
      if (message) {
        const userId = localStorage.getItem('userId');
        if (!message.readBy.includes(userId)) {
          message.readBy.push(userId);
          await store.put(message);
        }
      }
    }));

    await tx.done;
  }, [storage]);

  // Mark messages as read on the server
  const markMessagesRead = useCallback(async (messageIds) => {
    if (!messageIds.length) return;

    try {
      // Update server
      await api.post('/teams/messages/read', {
        messageIds
      });

      // Update local storage
      await markMessagesReadLocally(messageIds);

      // Notify other clients
      messageIds.forEach(messageId => {
        socket?.emit('team:markRead', {
          type: 'team:markRead',
          teamId,
          messageId
        });
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [teamId, socket, markMessagesReadLocally]);

  // Auto-mark visible messages as read
  const handleVisibleMessages = useCallback((entries, observer) => {
    const unreadMessages = entries
      .filter(entry => entry.isIntersecting)
      .map(entry => entry.target.dataset.messageId)
      .filter(Boolean);

    if (unreadMessages.length) {
      markMessagesRead(unreadMessages);
    }
  }, [markMessagesRead]);

  // Set up intersection observer for read receipts
  useEffect(() => {
    const observer = new IntersectionObserver(handleVisibleMessages, {
      root: null,
      rootMargin: '0px',
      threshold: 1.0
    });

    // Observe unread messages
    const unreadElements = document.querySelectorAll('[data-message-id]:not([data-read="true"])');
    unreadElements.forEach(element => observer.observe(element));

    return () => {
      observer.disconnect();
    };
  }, [handleVisibleMessages]);

  // Listen for read receipts from other users
  useEffect(() => {
    if (!socket) return;

    const handleReadReceipt = async (data) => {
      if (data.teamId === teamId) {
        await markMessagesReadLocally([data.messageId]);
      }
    };

    socket.on('team:markRead', handleReadReceipt);

    return () => {
      socket.off('team:markRead', handleReadReceipt);
    };
  }, [socket, teamId, markMessagesReadLocally]);

  return {
    markMessagesRead
  };
};