// client/src/services/api.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Create axios instance with auth headers
const createAuthAxios = () => {
  const token = localStorage.getItem('token');
  return axios.create({
    baseURL: API_URL,
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
};

// Admin Services
export const adminService = {
  getUsers: async () => {
    const api = createAuthAxios();
    const response = await api.get('/api/admin/users');
    return response.data;
  },

  getPendingSupervisors: async () => {
    const api = createAuthAxios();
    const response = await api.get('/api/admin/pending-supervisors');
    return response.data;
  },

  approveSupervisor: async (id) => {
    const api = createAuthAxios();
    const response = await api.put(`/api/admin/approve-supervisor/${id}`);
    return response.data;
  },

  deleteUser: async (id) => {
    const api = createAuthAxios();
    const response = await api.delete(`/api/admin/users/${id}`);
    return response.data;
  }
};

// Supervisor Services
export const supervisorService = {
  getStudents: async () => {
    const api = createAuthAxios();
    const response = await api.get('/api/supervisor/students');
    return response.data;
  },

  getTeams: async () => {
    const api = createAuthAxios();
    const response = await api.get('/api/supervisor/teams');
    return response.data;
  },

  updateStudentProgress: async (data) => {
    const api = createAuthAxios();
    const response = await api.put('/api/supervisor/student-progress', data);
    return response.data;
  },

  markStudent: async (data) => {
    const api = createAuthAxios();
    const response = await api.post('/api/supervisor/mark-student', data);
    return response.data;
  },

  sendMessage: async (data) => {
    const api = createAuthAxios();
    const response = await api.post('/api/supervisor/send-message', data);
    return response.data;
  },

  reviewReport: async (data) => {
    const api = createAuthAxios();
    const response = await api.post('/api/supervisor/review-report', data);
    return response.data;
  }
};

// Student Services
export const studentService = {
  createTeam: async (data) => {
    const api = createAuthAxios();
    const response = await api.post('/api/student/create-team', data);
    return response.data;
  },

  joinTeam: async (data) => {
    const api = createAuthAxios();
    const response = await api.post('/api/student/join-team', data);
    return response.data;
  },

  inviteToTeam: async (data) => {
    const api = createAuthAxios();
    const response = await api.post('/api/student/invite-to-team', data);
    return response.data;
  },

  createProject: async (data) => {
    const api = createAuthAxios();
    const response = await api.post('/api/student/create-project', data);
    return response.data;
  },

  submitReport: async (data) => {
    const api = createAuthAxios();
    const response = await api.post('/api/student/submit-report', data);
    return response.data;
  },

  getMessages: async () => {
    const api = createAuthAxios();
    const response = await api.get('/api/student/messages');
    return response.data;
  },

  markMessageAsRead: async (messageId) => {
    const api = createAuthAxios();
    const response = await api.put(`/student/messages/${messageId}/read`);
    return response.data;
  }
};