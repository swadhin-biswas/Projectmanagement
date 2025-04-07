// API functions for project management
import { api } from '../lib/api';

export const projectAPI = {
  // Create a new project
  createProject: async (projectData) => {
    try {
      const response = await api.post('/api/projects', projectData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to create project' };
    }
  },

  // Get all projects
  getAllProjects: async () => {
    try {
      const response = await api.get('/api/projects');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch projects' };
    }
  },

  // Get project by ID
  getProject: async (projectId) => {
    try {
      const response = await api.get(`/api/projects/${projectId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch project' };
    }
  },

  // Update project
  updateProject: async (projectId, data) => {
    try {
      const response = await api.patch(`/api/projects/${projectId}`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update project' };
    }
  },

  // Submit project files
  submitProject: async (projectId, data) => {
    try {
      const response = await api.post(`/api/projects/${projectId}/submissions`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to submit project' };
    }
  },

  // Get project submissions
  getSubmissions: async (projectId) => {
    try {
      const response = await api.get(`/api/projects/${projectId}/submissions`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch submissions' };
    }
  },

  // Milestone management
  createMilestone: async (projectId, data) => {
    try {
      const response = await api.post(`/api/projects/${projectId}/milestones`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to create milestone' };
    }
  },

  updateMilestone: async (projectId, milestoneId, data) => {
    try {
      const response = await api.patch(`/api/projects/${projectId}/milestones/${milestoneId}`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update milestone' };
    }
  },

  deleteMilestone: async (projectId, milestoneId) => {
    try {
      const response = await api.delete(`/api/projects/${projectId}/milestones/${milestoneId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delete milestone' };
    }
  }
};

export default projectAPI;