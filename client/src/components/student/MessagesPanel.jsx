import React, { useState } from "react";

const MessagesPanel = ({
  messages,
  isLoading,
  onMarkAsRead,
  refreshMessages,
}) => {
  const [selectedMessage, setSelectedMessage] = useState(null);

  const handleMessageSelect = (message) => {
    setSelectedMessage(message);
    if (!message.isRead) {
      onMarkAsRead(message._id);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Messages</h2>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : messages.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No messages yet.</p>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row gap-4">
          {/* Messages List */}
          <div className="w-full md:w-1/3 bg-gray-50 rounded-lg overflow-hidden">
            <div className="p-4 bg-gray-100 border-b border-gray-200">
              <h3 className="font-medium">Inbox</h3>
              <button
                onClick={refreshMessages}
                className="text-sm text-blue-600 hover:text-blue-800 mt-1"
              >
                Refresh
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {messages.map((message) => (
                <div
                  key={message._id}
                  onClick={() => handleMessageSelect(message)}
                  className={`p-4 border-b border-gray-200 cursor-pointer ${
                    selectedMessage?._id === message._id ? "bg-blue-50" : ""
                  } ${!message.isRead ? "font-semibold" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm">
                      From: {message.sender?.fullName || "Unknown"}
                    </span>
                    {!message.isRead && (
                      <span className="bg-blue-500 rounded-full w-2 h-2"></span>
                    )}
                  </div>
                  <div className="text-sm font-medium truncate mt-1">
                    {message.subject || "No Subject"}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {formatDate(message.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Message Content */}
          <div className="flex-1 bg-white rounded-lg border border-gray-200">
            {selectedMessage ? (
              <div className="p-6">
                <div className="mb-6">
                  <h3 className="text-xl font-semibold">
                    {selectedMessage.subject || "No Subject"}
                  </h3>
                  <div className="mt-2 text-sm text-gray-600">
                    <p>
                      <strong>From:</strong>{" "}
                      {selectedMessage.sender?.fullName || "Unknown"}
                    </p>
                    <p>
                      <strong>Date:</strong>{" "}
                      {formatDate(selectedMessage.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <div className="prose max-w-none">
                    {selectedMessage.content}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <p className="text-gray-500">Select a message to view</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagesPanel;
