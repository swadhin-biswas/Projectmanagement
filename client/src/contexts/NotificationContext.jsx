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
import { api } from "../lib/api";
import { useAuth } from "./AuthContext";
import { useWebSocket } from "./WebSocketContext";

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();
  const { socket } = useWebSocket();

  useEffect(() => {
    if (!user) return;

    // Load initial notifications
    fetchNotifications();
    fetchUnreadCount();

    // Listen for new notifications via WebSocket
    if (socket) {
      socket.on('notification', handleNewNotification);
    }

    return () => {
      if (socket) {
        socket.off('notification', handleNewNotification);
      }
    };
  }, [user, socket]);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications');
      const data = await response.json();
      if (data.success) {
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('/api/notifications/unread/count');
      const data = await response.json();
      if (data.success) {
        setUnreadCount(data.count);
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  const handleNewNotification = (notification) => {
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);

    // Show toast for important notifications
    if (['team_invite', 'project_feedback', 'supervisor_message'].includes(notification.type)) {
      toast(notification.title, {
        description: notification.message,
        action: {
          label: "View",
          onClick: () => notification.link && window.location.assign(notification.link)
        }
      });
    }
  };

  const markAsRead = async (notificationIds) => {
    try {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds })
      });

      const data = await response.json();
      if (data.success) {
        setNotifications(prev =>
          prev.map(n =>
            notificationIds.includes(n._id) ? { ...n, isRead: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - notificationIds.length));
      }
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
    }
  };

  const clearAll = async () => {
    try {
      const response = await fetch('/api/notifications/clear-all', {
        method: 'POST'
      });

      const data = await response.json();
      if (data.success) {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Failed to clear notifications:', error);
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
                    {!notification.read && (
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
