import { formatDistanceToNow } from 'date-fns';
import { PaperClipIcon, SendIcon } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { useTeamChat } from '../../hooks/useTeamChat';
import { api } from '../../lib/api';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

export const TeamChat = ({ teamId }) => {
  const { user } = useAuth();
  const {
    messages,
    sendMessage,
    loadMoreMessages,
    hasMore,
    isLoading,
    markAsRead
  } = useTeamChat(teamId);

  const [newMessage, setNewMessage] = useState('');
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Mark messages as read when chat is opened
  useEffect(() => {
    markAsRead();
  }, []);

  // Handle infinite scroll
  const { loadMore, containerRef } = useInfiniteScroll({
    onLoadMore: loadMoreMessages,
    hasMore,
    isLoading
  });

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && attachments.length === 0) return;

    try {
      await sendMessage({
        content: newMessage.trim(),
        isAnnouncement,
        attachments
      });
      setNewMessage('');
      setAttachments([]);
      setIsAnnouncement(false);
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 5) {
      toast.error('Maximum 5 files allowed');
      return;
    }

    // Check file sizes
    const maxSize = 10 * 1024 * 1024; // 10MB
    const invalidFiles = files.filter(file => file.size > maxSize);
    if (invalidFiles.length > 0) {
      toast.error(`Files must be under 10MB: ${invalidFiles.map(f => f.name).join(', ')}`);
      return;
    }

    // Show loading state for uploads
    toast.loading('Uploading files...', { id: 'upload' });

    // Upload files and get URLs
    Promise.all(files.map(async file => {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post('/api/upload', formData);
        return {
          url: response.data.url,
          type: file.type.startsWith('image/') ? 'image' : 'file',
          name: file.name
        };
      } catch (error) {
        console.error('File upload error:', error);
        toast.error(`Failed to upload ${file.name}`);
        return null;
      }
    })).then(results => {
      const validUploads = results.filter(Boolean);
      setAttachments(prev => [...prev, ...validUploads]);
      toast.success('Files uploaded successfully', { id: 'upload' });
    });
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const renderMessage = (message) => (
    <div
      key={message._id}
      className={`flex gap-3 mb-4 ${
        message.isAnnouncement ? 'bg-yellow-50 p-3 rounded' : ''
      }`}
    >
      <Avatar>
        <AvatarImage src={message.sender.profilePicture} />
        <AvatarFallback>
          {message.sender.fullName.split(' ').map(n => n[0]).join('')}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold">
            {message.sender.fullName}
          </span>
          <span className="text-sm text-gray-500">
            {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
          </span>
          {message.isAnnouncement && (
            <span className="text-xs bg-yellow-200 px-2 py-0.5 rounded">
              Announcement
            </span>
          )}
        </div>
        <p className="mt-1">{message.content}</p>
        {message.attachments?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.attachments.map((attachment, index) => (
              <div
                key={index}
                className="relative group"
              >
                {attachment.type === 'image' ? (
                  <img
                    src={attachment.url}
                    alt=""
                    className="max-w-[200px] rounded"
                  />
                ) : (
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 bg-gray-100 rounded hover:bg-gray-200"
                  >
                    <PaperClipIcon size={16} />
                    <span className="text-sm">{attachment.name}</span>
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Card className="h-[600px] flex flex-col">
      <Tabs defaultValue="chat" className="flex-1">
        <TabsList className="px-4 py-2">
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="flex-1 flex flex-col">
          <ScrollArea
            ref={containerRef}
            className="flex-1 p-4"
            onScroll={loadMore}
          >
            {isLoading && <div className="text-center">Loading...</div>}
            {messages.map(renderMessage)}
            <div ref={chatEndRef} />
          </ScrollArea>
        </TabsContent>

        <TabsContent value="announcements" className="flex-1">
          <ScrollArea className="h-full p-4">
            {messages
              .filter(m => m.isAnnouncement)
              .map(renderMessage)}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      <form onSubmit={handleSend} className="p-4 border-t">
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-gray-100 p-1 rounded"
              >
                <span className="text-sm">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
          />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            multiple
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <PaperClipIcon size={20} />
          </Button>
          <Button type="submit" disabled={!newMessage.trim() && !attachments.length}>
            <SendIcon size={20} />
          </Button>
        </div>

        {/* Announcement toggle for team leaders */}
        <div className="mt-2 flex items-center gap-2">
          <input
            type="checkbox"
            id="announcement"
            checked={isAnnouncement}
            onChange={(e) => setIsAnnouncement(e.target.checked)}
          />
          <label htmlFor="announcement" className="text-sm">
            Send as announcement
          </label>
        </div>
      </form>
    </Card>
  );
};

// Export as default for compatibility with existing imports
export default TeamChat;
