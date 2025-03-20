import React, { useState, useRef, useEffect } from 'react';
import { Avatar } from '../ui/Avatar';
import { Card } from '../ui/Card';

const TeamChat = ({ messages = [], onSendMessage, currentUser }) => {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newMessage.trim()) {
      onSendMessage(newMessage);
      setNewMessage('');
    }
  };

  return (
    <Card className="flex flex-col h-[600px]">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold">Team Chat</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.sender._id === currentUser._id ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`flex items-start space-x-2 max-w-[70%] ${
                message.sender._id === currentUser._id ? 'flex-row-reverse' : ''
              }`}
            >
              <Avatar
                src={message.sender.profilePicture}
                alt={message.sender.name}
                className="w-8 h-8"
              />
              <div
                className={`rounded-lg p-3 ${
                  message.sender._id === currentUser._id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100'
                }`}
              >
                <p className="text-sm font-medium mb-1">
                  {message.sender._id === currentUser._id ? 'You' : message.sender.name}
                </p>
                <p className="text-sm">{message.content}</p>
                <p className="text-xs mt-1 opacity-70">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 input-primary"
          />
          <button type="submit" className="btn-primary">
            Send
          </button>
        </div>
      </form>
    </Card>
  );
};

export default TeamChat;
