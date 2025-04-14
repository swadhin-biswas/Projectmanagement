import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Bell } from "lucide-react";
import {
  createContext,
  default as React,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "sonner";
import apiClient from "../lib/apiClient";
import { useAuth } from "./AuthContext";
import { useWebSocket } from "./WebSocketContext";

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMarking, setIsMarking] = useState(false);
  const { user } = useAuth();
  const { socket } = useWebSocket();

  useEffect(() => {
    if (!user) return;

    // Track if the component is mounted to prevent state updates after unmounting
    let isMounted = true;

    // Only try to fetch notifications if we have a user and authentication
    const initializeNotifications = async () => {
      try {
        // Add a small delay to ensure token is properly set in storage
        await new Promise((resolve) => setTimeout(resolve, 500));

        if (isMounted) {
          await fetchNotifications();
          await fetchUnreadCount();
        }
      } catch (error) {
        console.error("Failed to initialize notifications:", error);
      }
    };

    // Initialize notifications once
    initializeNotifications();

    // Schedule regular polling for notifications - but with rate limiting
    let pollingCount = 0;
    const maxPollingAttempts = 5; // Stop trying after 5 failed attempts
    let failedAttempts = 0;

    const pollingInterval = setInterval(async () => {
      if (!user || !isMounted) return;

      pollingCount++;

      try {
        // Only poll for unread count to minimize requests
        await fetchUnreadCount();

        // Reset failed attempts on success
        failedAttempts = 0;

        // Refresh full notifications every 5 poll cycles
        if (pollingCount % 5 === 0) {
          await fetchNotifications();
        }
      } catch (error) {
        failedAttempts++;
        console.error(
          `Failed to poll notifications (attempt ${failedAttempts}/${maxPollingAttempts}):`,
          error
        );

        // If we've had too many failures, stop polling
        if (failedAttempts >= maxPollingAttempts) {
          console.warn(
            "Stopping notification polling due to repeated failures"
          );
          clearInterval(pollingInterval);
        }
      }
    }, 60000); // Check every minute

    // Listen for new notifications via WebSocket
    if (socket) {
      socket.on("notification", handleNewNotification);
    }

    return () => {
      isMounted = false;
      clearInterval(pollingInterval);
      if (socket) {
        socket.off("notification", handleNewNotification);
      }
    };
  }, [user, socket]);

  const fetchNotifications = async () => {
    try {
      const response = await apiClient.get("/notifications", {
        requiresAuth: true, // Skip if not authenticated
        silent: true, // Don't show errors to the user
      });

      if (response.data.success) {
        setNotifications(response.data.notifications || []);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      // Don't throw - allow app to continue
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await apiClient.get("/notifications/unread/count", {
        requiresAuth: true, // Skip if not authenticated
        silent: true, // Don't show errors to the user
      });

      if (response.data.success) {
        setUnreadCount(response.data.count || 0);
      }
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
      // Don't throw - allow app to continue
    }
  };

  const handleNewNotification = (notification) => {
    setNotifications((prev) => [notification, ...prev]);
    setUnreadCount((prev) => prev + 1);

    // Show toast for important notifications
    if (
      ["team_invite", "project_feedback", "supervisor_message"].includes(
        notification.type
      )
    ) {
      toast(notification.title, {
        description: notification.message,
        action: {
          label: "View",
          onClick: () =>
            notification.link && window.location.assign(notification.link),
        },
      });
    }
  };

  const markAsRead = async (notificationIds) => {
    if (!Array.isArray(notificationIds)) {
      notificationIds = [notificationIds]; // Convert single ID to array
    }

    setIsMarking(true);
    try {
      const response = await apiClient.post("/notifications/mark-read", {
        notificationIds,
      });

      if (response.data.success) {
        setNotifications((prev) =>
          prev.map((n) =>
            notificationIds.includes(n._id) ? { ...n, isRead: true } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - notificationIds.length));
      }
    } catch (error) {
      console.error("Failed to mark notifications as read:", error);
      toast.error("Failed to mark notifications as read");
    } finally {
      setIsMarking(false);
    }
  };

  const markAllAsRead = async () => {
    setIsMarking(true);
    try {
      const response = await apiClient.put("/notifications/read-all");

      if (response.data.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
        toast.success("All notifications marked as read");
      }
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
      toast.error("Failed to mark all notifications as read");
    } finally {
      setIsMarking(false);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await apiClient.delete(`/notifications/${notificationId}`);
      setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
      if (prev.find((n) => n._id === notificationId && !n.isRead)) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Failed to delete notification:", error);
      toast.error("Failed to delete notification");
    }
  };

  const clearAll = async () => {
    try {
      const response = await apiClient.post("/notifications/clear-all");

      if (response.data.success) {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Failed to clear notifications:", error);
    }
  };

  const NotificationIcon = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              disabled={isMarking}
              onClick={() => markAllAsRead()}
            >
              Mark all as read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[300px]">
          <DropdownMenuGroup>
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification._id}
                  className="flex flex-col items-start p-4 space-y-1 focus:bg-accent"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-medium">{notification.title}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification._id);
                      }}
                    >
                      ×
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {notification.message}
                  </p>
                  <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
                    <time>
                      {format(
                        new Date(notification.createdAt),
                        "MMM d, h:mm a"
                      )}
                    </time>
                    {!notification.isRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6"
                        disabled={isMarking}
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification._id);
                        }}
                      >
                        Mark as read
                      </Button>
                    )}
                  </div>
                </DropdownMenuItem>
              ))
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                No notifications
              </div>
            )}
          </DropdownMenuGroup>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        clearAll,
        refetch: fetchNotifications,
        NotificationIcon,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
};
