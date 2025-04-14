import { useAuth } from "@/contexts/AuthContext";
import { useWebSocket } from "@/contexts/WebSocketContext";
import apiClient from "@/lib/apiClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";

export function useNotifications() {
  const { user, isAuthenticated } = useAuth();
  const { isConnected } = useWebSocket();
  const queryClient = useQueryClient();

  // Fetch notifications
  const {
    data: notifications = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const response = await apiClient.get("/notifications", {
        requiresAuth: true,
        silent: true,
      });
      if (!response.data.success) {
        // Return empty array instead of throwing if we get a failure due to auth
        if (response.data.error === "Authentication required") {
          return [];
        }
        throw new Error(response.data.error || "Failed to fetch notifications");
      }
      // Handle both data formats: data.data.notifications or data.notifications
      return (
        response.data.data?.notifications || response.data.notifications || []
      );
    },
    enabled: !!user && isAuthenticated, // Only run query if authenticated
    staleTime: 1000 * 60, // 1 minute
    retry: 1, // Only retry once to avoid infinite loops
    retryDelay: 5000, // Wait 5 seconds before retrying
  });

  // Mark notification as read
  const markAsRead = useMutation({
    mutationFn: async (notificationId) => {
      if (!isAuthenticated) {
        throw new Error("User not authenticated");
      }

      const response = await apiClient.put(
        `/notifications/${notificationId}/read`,
        null,
        { requiresAuth: true }
      );

      if (!response.data.success) {
        throw new Error(
          response.data.error || "Failed to mark notification as read"
        );
      }
      return response.data;
    },
    onSuccess: (_, notificationId) => {
      // Update notification in cache
      queryClient.setQueryData(["notifications"], (old) => {
        if (!old) return [];
        return old.map((n) =>
          n._id === notificationId
            ? { ...n, isRead: true, read: true } // Support both field names
            : n
        );
      });
    },
  });

  // Mark all notifications as read
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!isAuthenticated) {
        throw new Error("User not authenticated");
      }

      const response = await apiClient.put("/notifications/read-all", null, {
        requiresAuth: true,
      });

      if (!response.data.success) {
        throw new Error(
          response.data.error || "Failed to mark all notifications as read"
        );
      }
      return response.data;
    },
    onSuccess: () => {
      // Update all notifications in cache
      queryClient.setQueryData(["notifications"], (old) => {
        if (!old) return [];
        return old.map((n) => ({ ...n, isRead: true, read: true })); // Support both field names
      });
    },
  });

  // Delete notification
  const deleteNotification = useMutation({
    mutationFn: async (notificationId) => {
      if (!isAuthenticated) {
        throw new Error("User not authenticated");
      }

      await apiClient.delete(`/notifications/${notificationId}`, {
        requiresAuth: true,
      });
    },
    onSuccess: (_, notificationId) => {
      // Remove notification from cache
      queryClient.setQueryData(["notifications"], (old) => {
        if (!old) return [];
        return old.filter((n) => n._id !== notificationId);
      });
    },
  });

  // Handle real-time notification updates
  useEffect(() => {
    if (!isConnected || !isAuthenticated) return;

    // Listen for new notifications
    const handleNotification = (data) => {
      if (data.type !== "notification") return;

      // Add notification to cache
      queryClient.setQueryData(["notifications"], (old) => {
        if (!old) return [data.notification];
        return [data.notification, ...old];
      });

      // Show toast notification
      toast[data.notification.type || "info"](data.notification.title, {
        description: data.notification.message,
        action: data.notification.action
          ? {
              label: data.notification.action.label,
              onClick: () => markAsRead.mutate(data.notification._id),
            }
          : undefined,
      });
    };

    // Register event listener
    window.addEventListener("ws-message", handleNotification);
    return () => window.removeEventListener("ws-message", handleNotification);
  }, [isConnected, isAuthenticated, queryClient]);

  // Calculate unread count - handle both isRead and read fields
  const unreadCount = notifications.filter((n) => !(n.isRead || n.read)).length;

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead: markAsRead.mutate,
    markAllAsRead: markAllAsRead.mutate,
    deleteNotification: deleteNotification.mutate,
    isMarking: markAsRead.isLoading || markAllAsRead.isLoading,
    isDeleting: deleteNotification.isLoading,
  };
}
