import axios from 'axios';

// Export all API functions
import { authAPI } from './auth'; // Import authAPI from auth.js
import dashboardAPI from './dashboard';
import projectAPI from './projects';
import sessionAPI from './sessions';
import teamAPI from './teams';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for API calls
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for API calls
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle expired token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      localStorage.removeItem('token');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Format error response consistently
    if (error.response?.data) {
      return Promise.reject({
        ...error,
        message: error.response.data.error || error.message,
      });
    }

    return Promise.reject(error);
  }
);

// Export all APIs
export {
  api, // Export the base api instance
  authAPI, dashboardAPI, projectAPI, sessionAPI,
  teamAPI
};

export default api;