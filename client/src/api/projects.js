// API functions for project management
import { api } from '../lib/api'; // Correct import path

export const projectAPI = {
  // Create a new project (Team Leader)
  createProject: async (projectData) => {
    try {
      const response = await api.post('/student/create-project', projectData);
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        throw error.response.data;
      } else {
        throw { message: 'Failed to create project', ...error };
      }
    }
  },

  // Get all projects for a supervisor (only available to supervisors)
  getAllProjects: async () => {
    try {
      const response = await api.get('/supervisor/teams');
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        throw error.response.data;
      } else {
        throw { message: 'Failed to fetch projects', ...error };
      }
    }
  },

  // Get student dashboard (includes student projects)
  getStudentProjects: async () => {
    try {
      const response = await api.get('/dashboard/student');
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        throw error.response.data;
      } else {
        throw { message: 'Failed to fetch student projects', ...error };
      }
    }
  },

  // Submit a report for a project
  submitReport: async (reportData) => {
    try {
      const response = await api.post('/student/submit-report', reportData);
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        throw error.response.data;
      } else {
        throw { message: 'Failed to submit report', ...error };
      }
    }
  },

  // Update a student's progress (Supervisor)
  updateStudentProgress: async (progressData) => {
    try {
      const response = await api.put('/supervisor/student-progress', progressData);
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        throw error.response.data;
      } else {
        throw { message: 'Failed to update student progress', ...error };
      }
    }
  },

  // Add marks for a student (Supervisor)
  addMarks: async (marksData) => {
    try {
      const response = await api.post('/supervisor/mark-student', marksData);
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        throw error.response.data;
      } else {
        throw { message: 'Failed to add marks', ...error };
      }
    }
  },

  // Review a report (Supervisor)
  reviewReport: async (reviewData) => {
    try {
      const response = await api.post('/supervisor/review-report', reviewData);
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        throw error.response.data;
      } else {
        throw { message: 'Failed to review report', ...error };
      }
    }
  },

  // Send a message (Supervisor)
  sendMessage: async (messageData) => {
    try {
      const response = await api.post('/supervisor/send-message', messageData);
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        throw error.response.data;
      } else {
        throw { message: 'Failed to send message', ...error };
      }
    }
  },

  // Get student messages
  getStudentMessages: async () => {
    try {
      const response = await api.get('/student/messages');
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        throw error.response.data;
      } else {
        throw { message: 'Failed to fetch messages', ...error };
      }
    }
  },

  // Mark a message as read
  markMessageAsRead: async (messageId) => {
    try {
      const response = await api.put(`/student/messages/${messageId}/read`);
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        throw error.response.data;
      } else {
        throw { message: 'Failed to mark message as read', ...error };
      }
    }
  }
};

export default projectAPI;