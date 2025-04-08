import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { AnimatePresence, motion } from "framer-motion";
import { Info, Loader2, Send } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

const TeamChat = ({ teamId }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    watch,
  } = useForm({
    defaultValues: {
      content: "",
      isAnnouncement: false,
    },
  });

  const messageContent = watch("content");

  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setIsLoading(true);
        const response = await api.get(`/api/student/teams/${teamId}/chat`);

        if (response.data.success) {
          setMessages(response.data.data);
        } else {
          toast.error(response.data.error || "Failed to load chat messages");
        }
      } catch (error) {
        toast.error("Failed to load chat messages");
        console.error("Chat loading error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (teamId) {
      fetchMessages();
    }

    // Set up polling for new messages
    const interval = setInterval(() => {
      if (teamId) {
        fetchMessages();
      }
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, [teamId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Mark messages as read
  useEffect(() => {
    const markAsRead = async () => {
      if (teamId && messages.length > 0) {
        try {
          await api.post(`/api/student/teams/${teamId}/chat/read`);
        } catch (error) {
          console.error("Failed to mark messages as read:", error);
        }
      }
    };

    markAsRead();
  }, [teamId, messages]);

  const onSubmit = async (data) => {
    if (!data.content.trim()) return;

    try {
      setIsSending(true);
      const response = await api.post(
        `/api/student/teams/${teamId}/chat`,
        data
      );

      if (response.data.success) {
        // Add the new message to the chat
        setMessages((prev) => [...prev, response.data.data]);
        reset({ content: "", isAnnouncement: false });
      } else {
        toast.error(response.data.error || "Failed to send message");
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to send message");
      console.error("Chat send error:", error);
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";

    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      return (
        date.toLocaleDateString([], { month: "short", day: "numeric" }) +
        " " +
        date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    }
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const isCurrentUser = (senderId) => {
    return senderId === user?._id;
  };

  const fadeIn = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 },
  };

  const renderMessage = (message) => {
    const isMine = isCurrentUser(message.sender?._id);

    return (
      <motion.div
        key={message._id}
        className={`flex mb-4 ${isMine ? "justify-end" : "justify-start"}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div
          className={`flex ${
            isMine ? "flex-row-reverse" : "flex-row"
          } max-w-[80%]`}
        >
          <Avatar className={`h-8 w-8 ${isMine ? "ml-2" : "mr-2"}`}>
            {message.sender?.profilePicture ? (
              <AvatarImage
                src={message.sender.profilePicture}
                alt={message.sender.fullName}
              />
            ) : (
              <AvatarFallback
                className={isMine ? "bg-blue-600" : "bg-gray-600"}
              >
                {getInitials(message.sender?.fullName)}
              </AvatarFallback>
            )}
          </Avatar>

          <div>
            <div
              className={`flex items-center mb-1 ${
                isMine ? "justify-end" : "justify-start"
              }`}
            >
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatTime(message.timestamp)}
              </span>
              <span
                className={`text-sm font-medium mx-2 ${
                  isMine ? "text-blue-600 dark:text-blue-400" : ""
                }`}
              >
                {message.sender?.fullName || "Unknown User"}
              </span>
              {message.isAnnouncement && (
                <Badge
                  variant="outline"
                  className="border-blue-300 text-blue-600 text-xs"
                >
                  Announcement
                </Badge>
              )}
            </div>

            <div
              className={`p-3 rounded-lg ${
                message.isAnnouncement
                  ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                  : isMine
                  ? "bg-blue-100 dark:bg-blue-900/30"
                  : "bg-gray-100 dark:bg-gray-800"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap break-words">
                {message.content}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <AnimatePresence>
      <motion.div
        className="h-full flex flex-col"
        initial="initial"
        animate="animate"
        exit="exit"
        variants={fadeIn}
      >
        <Card className="border-gray-200 dark:border-gray-800 shadow-md flex-1 flex flex-col overflow-hidden">
          <CardHeader className="border-b border-gray-200 dark:border-gray-800 px-4 py-3">
            <CardTitle className="text-lg">Team Chat</CardTitle>
          </CardHeader>

          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4"
            style={{ maxHeight: "calc(100vh - 300px)", minHeight: "300px" }}
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Info className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  No messages yet. Start the conversation!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map(renderMessage)}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <CardContent className="border-t border-gray-200 dark:border-gray-800 p-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
              <Textarea
                {...register("content", { required: true })}
                placeholder="Type your message..."
                className="w-full resize-none"
                rows={3}
              />

              <div className="flex justify-end items-center gap-2">
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={isSending || !messageContent?.trim()}
                >
                  {isSending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};

export default TeamChat;
