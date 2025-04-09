import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Bell, Check, Clock, Info, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { cn } from "../lib/utils";

const NotificationPopup = ({ notification, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 500); // Wait for animation to complete
    }, 5000); // Auto-close after 5 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  const getIcon = () => {
    switch (notification.priority) {
      case "urgent":
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case "high":
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case "medium":
        return <Info className="h-5 w-5 text-blue-500" />;
      case "low":
        return <Bell className="h-5 w-5 text-gray-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getCategoryColor = () => {
    switch (notification.category) {
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
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 120 }}
          className={cn(
            "fixed bottom-4 right-4 z-50 w-96 rounded-lg shadow-lg overflow-hidden",
            "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
          )}
        >
          <div className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className="mt-1">{getIcon()}</div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {notification.title}
                    </h3>
                    <span
                      className={cn(
                        "px-2 py-1 text-xs rounded-full",
                        getCategoryColor()
                      )}
                    >
                      {notification.category}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    {notification.message}
                  </p>
                  {notification.action && (
                    <div className="mt-2">
                      <button
                        onClick={() => {
                          if (
                            notification.action.type === "link" &&
                            notification.action.url
                          ) {
                            window.location.href = notification.action.url;
                          }
                        }}
                        className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        {notification.action.label || "View"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setIsVisible(false);
                  setTimeout(onClose, 500);
                }}
                className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>
                {new Date(notification.createdAt).toLocaleTimeString()}
              </span>
              <div className="flex items-center space-x-2">
                {notification.isRead ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Clock className="h-4 w-4 text-gray-400" />
                )}
              </div>
            </div>
          </div>
          <div className="h-1 bg-gray-200 dark:bg-gray-700">
            <motion.div
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 5, ease: "linear" }}
              className="h-full bg-blue-500"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NotificationPopup;
