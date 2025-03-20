// API functions for dashboard data
import { api } from '../lib/api'; // Correct import path

export default {
  // Get student dashboard data
  getStudentDashboard: async () => {
    try {
      const response = await api.get('/dashboard/student');
      return response.data;
    } catch (error) {
      console.error("Student dashboard fetch error:", error);
      if (error.response && error.response.data) {
        throw error.response.data;
      } else {
          throw { message: 'Failed to fetch student dashboard', ...error };
      }
    }
  },
  // Get supervisor dashboard data
  getSupervisorDashboard: async () => {
    try {
      const response = await api.get('/dashboard/supervisor');
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        throw error.response.data;
      } else {
        throw { message: 'Failed to fetch supervisor dashboard', ...error };
      }
    }
  },

  // Get admin dashboard data
  getAdminDashboard: async () => {
    try {
      const response = await api.get('/dashboard/admin');
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        throw error.response.data;
      } else {
        throw { message: 'Failed to fetch admin dashboard', ...error };
      }
    }
  },

  // Get system overview (Admin/Supervisor)
  getSystemOverview: async () => {
    try {
      const response = await api.get('/analytics/overview');
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        throw error.response.data;
      } else {
        throw { message: 'Failed to fetch system overview', ...error };
      }
    }
  },

  // Get team statistics (Admin/Supervisor)
  getTeamStatistics: async () => {
    try {
      const response = await api.get('/analytics/teams');
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        throw error.response.data;
      } else {
        throw { message: 'Failed to fetch team statistics', ...error };
      }
    }
  },

  // Get submission statistics (Admin/Supervisor)
  getSubmissionStatistics: async () => {
    try {
      const response = await api.get('/analytics/submissions');
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        throw error.response.data;
      } else {
        throw { message: 'Failed to fetch submission statistics', ...error };
      }
    }
  },

  // Get performance metrics (Admin/Supervisor)
  getPerformanceMetrics: async () => {
    try {
      const response = await api.get('/analytics/performance');
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        throw error.response.data;
      } else {
        throw { message: 'Failed to fetch performance metrics', ...error };
      }
    }
  },
};