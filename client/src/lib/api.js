import axios from "axios";
import { toast } from "sonner";

// Constants
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const TOKEN_KEY = "auth_token";

// Create axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    "Content-Type": "application/json",
  },
});

// Cache storage for API responses
const cache = new Map();

// Function to invalidate cache entries that match a regex pattern
export const invalidateCache = (pattern) => {
  const regex = new RegExp(pattern);
  for (const key of cache.keys()) {
    if (regex.test(key)) {
      cache.delete(key);
    }
  }
};

// Add JWT token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Extract error details
    const errorMessage =
      error.response?.data?.error || "An unexpected error occurred";
    const statusCode = error.response?.status;

    // Handle specific error codes
    switch (statusCode) {
      case 401: // Unauthorized
        // Clear token and redirect to login if not already there
        localStorage.removeItem(TOKEN_KEY);
        if (
          window.location.pathname !== "/login" &&
          window.location.pathname !== "/register"
        ) {
          toast.error("Your session has expired. Please log in again.");
          setTimeout(() => {
            window.location.href = "/login";
          }, 1000);
        }
        break;

      case 403: // Forbidden
        toast.error("You do not have permission to access this resource");
        break;

      case 404: // Not Found
        // Don't show toast for Not Found, let the component handle it
        break;

      case 429: // Too Many Requests
        toast.error("Too many requests. Please try again later.");
        break;

      case 500: // Server Error
      case 502: // Bad Gateway
      case 503: // Service Unavailable
      case 504: // Gateway Timeout
        toast.error("Server error. Our team has been notified.");
        console.error("Server error:", error.response?.data);
        break;

      default:
        // Only show toast for unexpected errors if not handled by component
        if (!error.config?.suppressToast) {
          toast.error(errorMessage);
        }
    }

    return Promise.reject(error);
  }
);

/**
 * Set the JWT token for API requests
 * @param {string} token - JWT token
 */
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
};

/**
 * Get the current JWT token
 * @returns {string|null} JWT token
 */
export const getAuthToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * Clear the JWT token from storage
 */
export const clearAuthToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

/**
 * Check if user is authenticated
 * @returns {boolean} True if user has a valid auth token
 */
export const isAuthenticated = () => {
  return !!localStorage.getItem(TOKEN_KEY);
};

export default api;
