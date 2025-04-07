import React, { createContext, useContext, useEffect } from 'react';
import { ChatStorageService } from '../services/chatStorageService';

const ChatStorageContext = createContext(null);

const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
const MESSAGE_RETENTION = 7 * 24 * 60 * 60 * 1000; // 7 days
const SEARCH_HISTORY_RETENTION = 30 * 24 * 60 * 60 * 1000; // 30 days

export const ChatStorageProvider = ({ children }) => {
  const storageService = new ChatStorageService();

  // Periodic cleanup of old data
  useEffect(() => {
    const cleanup = async () => {
      try {
        const olderThanMessages = new Date(Date.now() - MESSAGE_RETENTION);
        const olderThanSearches = new Date(Date.now() - SEARCH_HISTORY_RETENTION);

        // Get all unique teamIds from messages
        const db = await storageService.dbPromise;
        const teams = await db.getAllKeys('messages', 'teamId');
        const uniqueTeams = [...new Set(teams)];

        // Clean up old messages for each team
        for (const teamId of uniqueTeams) {
          await storageService.clearOldMessages(teamId, olderThanMessages);
        }

        // Clean up old search history
        await storageService.clearOldSearchHistory(olderThanSearches.getTime());
      } catch (error) {
        console.error('Error during storage cleanup:', error);
      }
    };

    // Run initial cleanup
    cleanup();

    // Schedule periodic cleanup
    const interval = setInterval(cleanup, CLEANUP_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  return (
    <ChatStorageContext.Provider value={storageService}>
      {children}
    </ChatStorageContext.Provider>
  );
};

export const useChatStorage = () => {
  const context = useContext(ChatStorageContext);
  if (!context) {
    throw new Error('useChatStorage must be used within a ChatStorageProvider');
  }
  return context;
};