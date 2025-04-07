import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';

const RECONNECTION_ATTEMPTS = 5;
const RECONNECTION_DELAY = 1000;

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const { token, user } = useAuth();

  const connect = useCallback(() => {
    if (!token || !user) return;

    const socketInstance = io(import.meta.env.VITE_API_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: RECONNECTION_ATTEMPTS,
      reconnectionDelay: RECONNECTION_DELAY,
      query: {
        userId: user.id
      }
    });

    // Connection events
    socketInstance.on('connect', () => {
      setIsConnected(true);
      setReconnectAttempts(0);
      console.log('WebSocket connected');
      socketInstance.emit('join', `user:${user._id}`);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);

      if (reconnectAttempts >= RECONNECTION_ATTEMPTS) {
        toast.error('Unable to connect to chat server. Please refresh the page.');
      }
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setIsConnected(false);

      if (reason === 'io server disconnect') {
        // Server initiated disconnect, attempt reconnect
        socketInstance.connect();
      }

      setReconnectAttempts(prev => prev + 1);
    });

    // Reconnection events
    socketInstance.on('reconnect_attempt', (attemptNumber) => {
      console.log(`Attempting to reconnect (${attemptNumber}/${RECONNECTION_ATTEMPTS})`);
      setReconnectAttempts(attemptNumber);
    });

    socketInstance.on('reconnect_failed', () => {
      console.log('Failed to reconnect after maximum attempts');
      toast.error('Connection lost. Please refresh the page to reconnect.');
    });

    // Team-related events
    socketInstance.on('team:invite', ({ teamName }) => {
      toast.info(`You have been invited to join team ${teamName}`);
    });

    socketInstance.on('team:joined', ({ teamName }) => {
      toast.success(`Successfully joined team ${teamName}`);
    });

    socketInstance.on('team:left', ({ teamName }) => {
      toast.info(`You have left team ${teamName}`);
    });

    // Chat notifications when window is not focused
    socketInstance.on('team:message', ({ sender, teamName, isAnnouncement }) => {
      if (document.hidden) {
        if (isAnnouncement) {
          toast.info(`📢 New announcement in ${teamName}`);
        } else {
          toast.info(`New message from ${sender.fullName} in ${teamName}`);
        }

        // Trigger browser notification if permitted
        if (Notification.permission === 'granted') {
          new Notification(isAnnouncement ? '📢 New Announcement' : 'New Message', {
            body: isAnnouncement
              ? `New announcement in ${teamName}`
              : `${sender.fullName} sent a message in ${teamName}`,
            icon: '/favicon.ico'
          });
        }
      }
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [token, user, reconnectAttempts]);

  // Request notification permission
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Initialize socket connection
  useEffect(() => {
    const cleanup = connect();
    return () => cleanup?.();
  }, [connect]);

  const value = {
    socket,
    isConnected,
    reconnectAttempts
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};