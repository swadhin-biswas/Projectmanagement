import axios from "axios";

// Export all API functions
import { authAPI } from "./auth"; // Import authAPI from auth.js
import dashboardAPI from "./dashboard";
import projectAPI from "./projects";
import sessionAPI from "./sessions";
import teamAPI from "./teams";

// Cache keys - should match those in AuthContext
const CACHE_KEYS = {
  TOKEN: "token",
  USER: "user",
  AUTH_DATA: "auth_data",
};

// Helper function to ensure token is synced from storage
const syncTokenFromStorage = () => {
  const token = localStorage.getItem(CACHE_KEYS.TOKEN);
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Run sync on module load
syncTokenFromStorage();

// Request interceptor for API calls
api.interceptors.request.use(
  (config) => {
    // Always sync token before each request
    syncTokenFromStorage();
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

    // Handle expired token (401) ONLY if it's not the initial verification request
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest._noRetry
    ) {
      console.log(
        "API Interceptor: Caught 401, marking for retry (if applicable, but likely leads to logout)."
      );
      originalRequest._retry = true;
      // Don't attempt auto-retry here. Let the error propagate.
      // The AuthContext initialization or subsequent actions should handle the logout.
      return Promise.reject(error);
    } else if (error.response?.status === 401 && originalRequest._noRetry) {
      // If it's the verification call itself that failed with 401, just propagate the error.
      console.log(
        "API Interceptor: Caught 401 on verification request (_noRetry). Propagating error."
      );
      return Promise.reject(error);
    }

    // Format other error responses consistently
    if (error.response?.data) {
      return Promise.reject({
        ...error,
        message: error.response.data.error || error.message,
      });
    }

    // Handle network errors or timeouts more gracefully
    if (!error.response && error.message) {
      return Promise.reject(error); // Propagate network/config errors
    }

    // Fallback for unexpected errors
    return Promise.reject(error);
  }
);

// Export all APIs
export {
  api, // Export the base api instance
  authAPI,
  dashboardAPI,
  projectAPI,
  sessionAPI,
  syncTokenFromStorage,
  teamAPI,
};

export default api;
