import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { getStudentMessages, markMessageAsRead } from "../../api/student";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";

const MessagesPanel = () => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      setIsLoading(true);
      const data = await getStudentMessages();
      setMessages(data || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to fetch messages");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async (messageId) => {
    try {
      const response = await markMessageAsRead(messageId);
      if (response.success) {
        // Update the messages list locally
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === messageId ? { ...msg, isRead: true } : msg
          )
        );
        toast.success("Message marked as read");
      }
    } catch (error) {
      console.error("Error marking message as read:", error);
      toast.error("Failed to mark message as read");
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Messages</CardTitle>
          <CardDescription>Your recent messages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Messages</CardTitle>
          <CardDescription>Your recent messages</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={fetchMessages}>
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {messages.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            No messages found.
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message._id}
                className={`border rounded-lg p-4 ${
                  !message.isRead ? "bg-muted/50" : ""
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-medium">
                      From: {message.from.fullName}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {message.from.role} · {formatDate(message.createdAt)}
                    </p>
                  </div>
                  <div>{!message.isRead && <Badge>New</Badge>}</div>
                </div>
                <p className="text-sm mt-2">{message.content}</p>
                {!message.isRead && (
                  <div className="mt-3 text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleMarkAsRead(message._id)}
                    >
                      Mark as read
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MessagesPanel;
