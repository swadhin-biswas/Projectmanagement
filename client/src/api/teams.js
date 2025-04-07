import { api } from '../lib/api';

export const teamAPI = {
  // Team Management
  getTeam: async (teamId) => {
    try {
      const response = await api.get(`/api/teams/${teamId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch team details' };
    }
  },

  createTeam: async (data) => {
    try {
      const response = await api.post('/api/teams', data);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to create team' };
    }
  },

  // Team Members
  getTeamMembers: async (teamId) => {
    try {
      const response = await api.get(`/api/teams/${teamId}/members`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch team members' };
    }
  },

  sendInvite: async (teamId, data) => {
    try {
      const response = await api.post(`/api/teams/${teamId}/invite`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to send invitation' };
    }
  },

  respondToInvite: async (teamId, inviteId, response) => {
    try {
      const res = await api.post(`/api/teams/${teamId}/invite/${inviteId}/respond`, { response });
      return res.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to respond to invitation' };
    }
  },

  leaveTeam: async (teamId) => {
    try {
      const response = await api.delete(`/api/teams/${teamId}/leave`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to leave team' };
    }
  },

  // Team Chat
  getMessages: async (teamId, { limit = 50, before = null } = {}) => {
    try {
      const params = new URLSearchParams();
      if (limit) params.append('limit', limit);
      if (before) params.append('before', before);
      const response = await api.get(`/api/teams/${teamId}/chat?${params}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch messages' };
    }
  },

  sendMessage: async (teamId, data) => {
    try {
      const response = await api.post(`/api/teams/${teamId}/chat`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to send message' };
    }
  },

  getUnreadCount: async (teamId) => {
    try {
      const response = await api.get(`/api/teams/${teamId}/chat/unread`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get unread count' };
    }
  },

  markMessagesAsRead: async (teamId, messageIds) => {
    try {
      const response = await api.post(`/api/teams/${teamId}/chat/mark-read`, { messageIds });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to mark messages as read' };
    }
  },

  // Team Announcements
  getAnnouncements: async (teamId) => {
    try {
      const response = await api.get(`/api/teams/${teamId}/chat/announcements`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch announcements' };
    }
  }
};

export default teamAPI;
