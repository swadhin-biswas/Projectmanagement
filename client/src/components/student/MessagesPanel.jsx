import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

const MessagesPanel = () => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const response = await api.get('/student/messages');
      setMessages(response.data);
    } catch (error) {
      toast.error('Failed to fetch messages');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    try {
      await api.post('/student/messages', {
        content: newMessage,
        recipientRole: 'supervisor'
      });
      toast.success('Message sent successfully');
      setNewMessage('');
      fetchMessages();
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Messages</h2>

      <Card className="p-6">
        <div className="space-y-6">
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {messages.map((message) => (
              <div
                key={message._id}
                className={`p-4 rounded-lg ${
                  message.sender._id === message.recipient._id
                    ? 'bg-blue-50 ml-auto'
                    : 'bg-gray-50'
                } max-w-[80%]`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium">{message.sender.fullName}</p>
                    <p className="text-sm text-gray-500">{message.sender.role}</p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(message.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-gray-700">{message.content}</p>
              </div>
            ))}
          </div>

          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 p-2 border rounded-md"
              required
            />
            <Button type="submit">Send</Button>
          </form>
        </div>
      </Card>
    </div>
  );
};

export default MessagesPanel;
