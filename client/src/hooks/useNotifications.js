import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { api } from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { toast } from 'sonner';

export function useNotifications() {
  const { user } = useAuth();
  const { isConnected } = useWebSocket();
  const queryClient = useQueryClient();

  // Fetch notifications
  const {
    data: notifications = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await api.get('/api/notifications');
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch notifications');
      }
      return response.data.data;
    },
    enabled: !!user,
    staleTime: 1000 * 60, // 1 minute
  });

  // Mark notification as read
  const markAsRead = useMutation({
    mutationFn: async (notificationId) => {
      const response = await api.put(`/api/notifications/${notificationId}/read`);
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to mark notification as read');
      }
      return response.data;
    },
    onSuccess: (_, notificationId) => {
      // Update notification in cache
      queryClient.setQueryData(['notifications'], (old) => {
        if (!old) return [];
        return old.map(n =>
          n._id === notificationId
            ? { ...n, read: true }
            : n
        );
      });
    }
  });

  // Mark all notifications as read
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const response = await api.put('/api/notifications/read-all');
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to mark all notifications as read');
      }
      return response.data;
    },
    onSuccess: () => {
      // Update all notifications in cache
      queryClient.setQueryData(['notifications'], (old) => {
        if (!old) return [];
        return old.map(n => ({ ...n, read: true }));
      });
    }
  });

  // Delete notification
  const deleteNotification = useMutation({
    mutationFn: async (notificationId) => {
      await api.delete(`/api/notifications/${notificationId}`);
    },
    onSuccess: (_, notificationId) => {
      // Remove notification from cache
      queryClient.setQueryData(['notifications'], (old) => {
        if (!old) return [];
        return old.filter(n => n._id !== notificationId);
      });
    }
  });

  // Handle real-time notification updates
  useEffect(() => {
    if (!isConnected) return;

    // Listen for new notifications
    const handleNotification = (data) => {
      if (data.type !== 'notification') return;

      // Add notification to cache
      queryClient.setQueryData(['notifications'], (old) => {
        if (!old) return [data.notification];
        return [data.notification, ...old];
      });

      // Show toast notification
      toast[data.notification.type || 'info'](
        data.notification.title,
        {
          description: data.notification.message,
          action: data.notification.action ? {
            label: data.notification.action.label,
            onClick: () => markAsRead.mutate(data.notification._id)
          } : undefined
        }
      );
    };

    // Register event listener
    window.addEventListener('ws-message', handleNotification);
    return () => window.removeEventListener('ws-message', handleNotification);
  }, [isConnected, queryClient]);

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead: markAsRead.mutate,
    markAllAsRead: markAllAsRead.mutate,
    deleteNotification: deleteNotification.mutate,
    isMarking: markAsRead.isLoading || markAllAsRead.isLoading,
    isDeleting: deleteNotification.isLoading
  };
}