import { format } from "date-fns";
import { AlertTriangle, Bell, Check, Info } from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";
import { useNotifications } from "../contexts/NotificationContext";
import { cn } from "../lib/utils";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

const NotificationCenter = () => {
  const {
    notifications,
    unreadCount,
    isLoading,
    filters,
    pagination,
    updateFilters,
    updatePagination,
    markAsRead,
  } = useNotifications();

  const [selectedNotifications, setSelectedNotifications] = useState([]);

  const handleFilterChange = useCallback(
    (field, value) => {
      updateFilters({ [field]: value });
    },
    [updateFilters]
  );

  const handleSelectNotification = useCallback((notificationId) => {
    setSelectedNotifications((prev) =>
      prev.includes(notificationId)
        ? prev.filter((id) => id !== notificationId)
        : [...prev, notificationId]
    );
  }, []);

  const handleMarkSelectedAsRead = useCallback(async () => {
    if (selectedNotifications.length > 0) {
      await markAsRead(selectedNotifications);
      setSelectedNotifications([]);
    }
  }, [selectedNotifications, markAsRead]);

  const getCategoryColor = useCallback((category) => {
    switch (category) {
      case "academic":
        return "bg-blue-100 text-blue-800";
      case "administrative":
        return "bg-purple-100 text-purple-800";
      case "social":
        return "bg-green-100 text-green-800";
      case "technical":
        return "bg-yellow-100 text-yellow-800";
      case "urgent":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }, []);

  const getPriorityIcon = useCallback((priority) => {
    switch (priority) {
      case "urgent":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "high":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case "medium":
        return <Info className="h-4 w-4 text-blue-500" />;
      case "low":
        return <Bell className="h-4 w-4 text-gray-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  }, []);

  const handlePageChange = useCallback(
    (newPage) => {
      updatePagination({ page: newPage });
    },
    [updatePagination]
  );

  const memoizedNotifications = useMemo(
    () =>
      notifications.map((notification) => (
        <div
          key={notification._id}
          className={cn(
            "p-4 rounded-lg border transition-colors",
            "hover:bg-gray-50 dark:hover:bg-gray-800",
            selectedNotifications.includes(notification._id) &&
              "bg-blue-50 dark:bg-blue-900",
            !notification.isRead && "border-blue-500"
          )}
          onClick={() => handleSelectNotification(notification._id)}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="mt-1">
                {getPriorityIcon(notification.priority)}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold">{notification.title}</h3>
                  <Badge
                    className={cn(
                      "text-xs",
                      getCategoryColor(notification.category)
                    )}
                  >
                    {notification.category}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  {notification.message}
                </p>
                {notification.action && (
                  <div className="mt-2">
                    <Button
                      variant="link"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          notification.action.type === "link" &&
                          notification.action.url
                        ) {
                          window.location.href = notification.action.url;
                        }
                      }}
                    >
                      {notification.action.label || "View"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">
                {format(new Date(notification.createdAt), "MMM d, h:mm a")}
              </span>
              {notification.isRead ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <div className="h-2 w-2 rounded-full bg-blue-500" />
              )}
            </div>
          </div>
        </div>
      )),
    [
      notifications,
      selectedNotifications,
      handleSelectNotification,
      getPriorityIcon,
      getCategoryColor,
    ]
  );

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Bell className="h-6 w-6" />
          <h1 className="text-2xl font-semibold">Notifications</h1>
          {unreadCount > 0 && (
            <Badge variant="destructive">{unreadCount}</Badge>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkSelectedAsRead}
            disabled={selectedNotifications.length === 0}
          >
            <Check className="h-4 w-4 mr-2" />
            Mark Selected as Read
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select
            value={filters.type || ""}
            onValueChange={(value) => handleFilterChange("type", value || null)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Types</SelectItem>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="supervisor_message">
                Supervisor Message
              </SelectItem>
              <SelectItem value="team_invite">Team Invite</SelectItem>
              <SelectItem value="submission_feedback">
                Submission Feedback
              </SelectItem>
              <SelectItem value="deadline_reminder">
                Deadline Reminder
              </SelectItem>
              <SelectItem value="grade_assigned">Grade Assigned</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Category</Label>
          <Select
            value={filters.category || ""}
            onValueChange={(value) =>
              handleFilterChange("category", value || null)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Categories</SelectItem>
              <SelectItem value="academic">Academic</SelectItem>
              <SelectItem value="administrative">Administrative</SelectItem>
              <SelectItem value="social">Social</SelectItem>
              <SelectItem value="technical">Technical</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Priority</Label>
          <Select
            value={filters.priority || ""}
            onValueChange={(value) =>
              handleFilterChange("priority", value || null)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All Priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Priorities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={filters.isRead === null ? "" : filters.isRead.toString()}
            onValueChange={(value) =>
              handleFilterChange(
                "isRead",
                value === "" ? null : value === "true"
              )
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Status</SelectItem>
              <SelectItem value="false">Unread</SelectItem>
              <SelectItem value="true">Read</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No notifications found
          </div>
        ) : (
          memoizedNotifications
        )}
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(NotificationCenter);
