// API functions for session management
import { api } from '../lib/api'; // Correct import path

export const sessionAPI = {
  // Create a new session (Admin only)
  createSession: async (sessionData) => {
    try {
      const response = await api.post('/api/sessions', sessionData); // Correct endpoint
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        throw error.response.data;
      } else {
        throw { message: 'Failed to create session', ...error };
      }
    }
  },

  // Get all sessions
  getAllSessions: async () => {
    try {
      const response = await api.get('/api/sessions'); // Correct endpoint
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        throw error.response.data;
      } else {
        throw { message: 'Failed to fetch sessions', ...error };
      }
    }
  },

  // Get session by ID
  getSessionById: async (sessionId) => {
    try {
      const response = await api.get(`/api/sessions/${sessionId}`); // Correct endpoint
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        throw error.response.data;
      } else {
        throw { message: 'Failed to fetch session', ...error };
      }
    }
  },

  // Update session
  updateSession: async (sessionId, sessionData) => {
    try {
      const response = await api.put(`/api/sessions/${sessionId}`, sessionData); // Correct endpoint
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        throw error.response.data;
      } else {
        throw { message: 'Failed to update session', ...error };
      }
    }
  },

  // Add deadline to session
  addDeadline: async (sessionId, deadlineData) => {
    try {
      const response = await api.post(`/api/sessions/${sessionId}/deadlines`, deadlineData); // Correct endpoint
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        throw error.response.data;
      } else {
        throw { message: 'Failed to add deadline', ...error };
      }
    }
  },
};

export default sessionAPI;