// client/src/pages/StudentDashboard.jsx
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { studentService } from '../services/api';
import TeamManagement from '../components/student/TeamManagement';
import ProjectManagement from '../components/student/ProjectManagement';
import MessagesPanel from '../components/student/MessagesPanel';
import ReportsPanel from '../components/student/ReportsPanel';
import StudentProfile from '../components/student/StudentProfile';

const StudentDashboard = () => {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user && user.role === 'student') {
      fetchMessages();
    }
  }, [user]);

  const fetchMessages = async () => {
    try {
      setIsLoading(true);
      const data = await studentService.getMessages();
      setMessages(data);
      setUnreadCount(data.filter(msg => !msg.isRead).length);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async (messageId) => {
    try {
      await studentService.markMessageAsRead(messageId);
      setMessages(messages.map(msg =>
        msg._id === messageId ? { ...msg, isRead: true } : msg
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  if (!user || user.role !== 'student') {
    return <div className="text-center py-10">Access denied. Student privileges required.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Student Dashboard</h1>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Navigation */}
        <div className="w-full md:w-64 bg-gray-100 rounded-lg p-4">
          <nav>
            <ul>
              <li className="mb-2">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`w-full text-left px-4 py-2 rounded ${activeTab === 'profile' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'}`}
                >
                  My Profile
                </button>
              </li>
              <li className="mb-2">
                <button
                  onClick={() => setActiveTab('team')}
                  className={`w-full text-left px-4 py-2 rounded ${activeTab === 'team' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'}`}
                >
                  Team Management
                </button>
              </li>
              <li className="mb-2">
                <button
                  onClick={() => setActiveTab('project')}
                  className={`w-full text-left px-4 py-2 rounded ${activeTab === 'project' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'}`}
                >
                  Project Management
                </button>
              </li>
              <li className="mb-2">
                <button
                  onClick={() => setActiveTab('reports')}
                  className={`w-full text-left px-4 py-2 rounded ${activeTab === 'reports' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'}`}
                >
                  Submit Reports
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('messages')}
                  className={`w-full text-left px-4 py-2 rounded flex justify-between items-center ${activeTab === 'messages' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'}`}
                >
                  <span>Messages</span>
                  {unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </li>
            </ul>
          </nav>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 bg-white rounded-lg shadow-md p-6">
          {activeTab === 'profile' && <StudentProfile user={user} />}
          {activeTab === 'team' && <TeamManagement />}
          {activeTab === 'project' && <ProjectManagement />}
          {activeTab === 'reports' && <ReportsPanel />}
          {activeTab === 'messages' && (
            <MessagesPanel
              messages={messages}
              isLoading={isLoading}
              onMarkAsRead={handleMarkAsRead}
              refreshMessages={fetchMessages}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;