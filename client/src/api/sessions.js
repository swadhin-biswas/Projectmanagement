// API functions for session management
import { api } from "../lib/api"; // Correct import path

export const sessionAPI = {
  // Create a new session (Admin only)
  createSession: async (sessionData) => {
    try {
      const response = await api.post("/api/admin/sessions", sessionData);
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        throw error.response.data;
      } else {
        throw { message: "Failed to create session", ...error };
      }
    }
  },

  // Get all sessions with pagination, filtering, and sorting
  getAllSessions: async (filters = {}) => {
    try {
      const response = await api.get("/api/admin/sessions", {
        params: filters,
      });
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        throw error.response.data;
      } else {
        throw { message: "Failed to fetch sessions", ...error };
      }
    }
  },

  // Get session by ID
  getSessionById: async (sessionId) => {
    try {
      const response = await api.get(`/api/sessions/${sessionId}`);
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        throw error.response.data;
      } else {
        throw { message: "Failed to fetch session", ...error };
      }
    }
  },

  // Update session
  updateSession: async (sessionId, sessionData) => {
    try {
      const response = await api.put(`/api/sessions/${sessionId}`, sessionData);
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        throw error.response.data;
      } else {
        throw { message: "Failed to update session", ...error };
      }
    }
  },

  // Add deadline to session
  addDeadline: async (sessionId, deadlineData) => {
    try {
      const response = await api.post(
        `/api/sessions/${sessionId}/deadlines`,
        deadlineData
      );
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        throw error.response.data;
      } else {
        throw { message: "Failed to add deadline", ...error };
      }
    }
  },

  // Get detailed session analytics for admin dashboard
  getSessionDetailedAnalytics: async (sessionId, params = {}) => {
    try {
      const response = await api.get(
        `/api/admin/sessions/${sessionId}/analytics`,
        { params }
      );
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        throw error.response.data;
      } else {
        throw { message: "Failed to fetch session analytics", ...error };
      }
    }
  },

  // Get work data within a specific time range for a session
  getSessionWorkData: async (sessionId, params = {}) => {
    try {
      const response = await api.get(
        `/api/admin/sessions/${sessionId}/work-data`,
        { params }
      );
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        throw error.response.data;
      } else {
        throw { message: "Failed to fetch session work data", ...error };
      }
    }
  },

  // Activate a session
  activateSession: async (sessionId) => {
    try {
      const response = await api.post(
        `/api/admin/sessions/${sessionId}/activate`
      );
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        throw error.response.data;
      } else {
        throw { message: "Failed to activate session", ...error };
      }
    }
  },

  // Delete a deadline
  deleteDeadline: async (sessionId, deadlineId) => {
    try {
      const response = await api.delete(
        `/api/sessions/${sessionId}/deadlines/${deadlineId}`
      );
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        throw error.response.data;
      } else {
        throw { message: "Failed to delete deadline", ...error };
      }
    }
  },
};

export default sessionAPI;
