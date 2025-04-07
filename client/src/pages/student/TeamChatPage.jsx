import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';

const TeamChatPage = () => {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState(null);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['team-chat'],
    queryFn: async () => {
      const response = await api.get('/student/team-chat');
      return response.data;
    },
    refetchInterval: 10000 // Refetch every 10 seconds
  });

  const sendMessage = useMutation({
    mutationFn: async (messageData) => {
      const response = await api.post('/student/team-chat', messageData);
      return response.data;
    },
    onSuccess: () => {
      setMessage('');
      setAttachment(null);
      queryClient.invalidateQueries(['team-chat']);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to send message');
    }
  });

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim() && !attachment) return;

    const messageData = { content: message };
    if (attachment) {
      messageData.attachments = [attachment];
    }

    sendMessage.mutate(messageData);
  };

  const handleAttachment = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // For simplicity, we'll just use a direct URL
    // In production, you would upload to a storage service first
    const fileUrl = URL.createObjectURL(file);

    // Determine type
    let type = 'document';
    if (file.type.startsWith('image/')) type = 'image';
    if (file.type.startsWith('video/')) type = 'video';

    setAttachment({
      url: fileUrl,
      type,
      name: file.name
    });

    toast.success(`File "${file.name}" attached`);
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data?.messages]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (!data?.messages) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          No Team Found
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          You need to create or join a team to access team chat.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <div className="p-4 border-b">
        <h1 className="text-2xl font-bold">Team Chat</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {data.messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No messages yet. Be the first to send a message!
          </div>
        ) : (
          data.messages.map((msg) => (
            <div
              key={msg._id}
              className={`flex ${
                msg.sender.user._id === user._id
                  ? 'justify-end'
                  : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  msg.sender.user._id === user._id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                {msg.sender.user._id !== user._id && (
                  <div className="font-bold mb-1">{msg.sender.user.fullName}</div>
                )}

                <p className="break-words">{msg.content}</p>

                {msg.attachments?.length > 0 && (
                  <div className="mt-2">
                    {msg.attachments.map((attachment, i) => (
                      <div key={i} className="mt-1">
                        {attachment.type === 'image' ? (
                          <img
                            src={attachment.url}
                            alt={attachment.name || 'Attachment'}
                            className="max-w-full rounded"
                          />
                        ) : (
                          <a
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center underline text-blue-300"
                          >
                            {attachment.name || 'Attachment'}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="text-xs mt-1 opacity-70">
                  {new Date(msg.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {attachment && (
        <div className="px-4 py-2 bg-gray-100 dark:bg-gray-700 flex items-center">
          <span className="text-sm">{attachment.name}</span>
          <button
            onClick={() => setAttachment(null)}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="border-t p-4 flex">
        <label className="p-2 cursor-pointer">
          <input
            type="file"
            className="hidden"
            onChange={handleAttachment}
          />
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </label>

        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 p-2 rounded-md border dark:bg-gray-700 dark:border-gray-600"
        />

        <button
          type="submit"
          disabled={(!message.trim() && !attachment) || sendMessage.isLoading}
          className="ml-2 px-4 py-2 bg-blue-500 text-white rounded-md disabled:opacity-50"
        >
          {sendMessage.isLoading ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
};

export default TeamChatPage;