import { format } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Check, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import { useNotifications } from '../../context/NotificationContext';

const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications
  } = useNotifications();

  const priorityColors = {
    high: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
    medium: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
    low: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl z-50"
            >
              <div className="p-4 border-b dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold dark:text-white">
                    Notifications
                  </h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={markAllAsRead}
                      className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Mark all as read
                    </button>
                    <button
                      onClick={clearAllNotifications}
                      className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    >
                      Clear all
                    </button>
                  </div>
                </div>
              </div>

              <div className="max-h-[70vh] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    No notifications
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <motion.div
                      key={notification._id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`p-4 border-b dark:border-gray-700 ${
                        !notification.readAt
                          ? 'bg-blue-50 dark:bg-blue-900/20'
                          : ''
                      }`}
                    >
                      <div className="flex justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                priorityColors[notification.priority]
                              }`}
                            >
                              {notification.type}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {format(
                                new Date(notification.createdAt),
                                'MMM d, HH:mm'
                              )}
                            </span>
                          </div>
                          <h4 className="font-medium mt-1 dark:text-white">
                            {notification.title}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                            {notification.message}
                          </p>
                          {notification.sender && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              From: {notification.sender.fullName}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col space-y-2 ml-4">
                          {!notification.readAt && (
                            <button
                              onClick={() => markAsRead(notification._id)}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              <Check className="h-5 w-5" />
                            </button>
                          )}
                          <button
                            onClick={() => clearNotification(notification._id)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationCenter;