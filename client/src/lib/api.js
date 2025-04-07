import axios from "axios";
import { toast } from "react-hot-toast";

// Create axios instance with defaults
export const api = axios.create({
  baseURL: "/api",
  timeout: 30000, // Increase timeout to 30 seconds
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

// Add a response interceptor to handle errors globally
api.interceptors.response.use(
  (response) => {
    // If the response has a controller or timeoutId property, clean it
    if (
      response.data &&
      (response.data.controller || response.data.timeoutId)
    ) {
      // Create a clean response with default values if needed
      const cleanResponse = {
        ...response,
        data: {
          success:
            response.data.success !== undefined ? response.data.success : true,
          data: response.data.data || {},
          message: response.data.message || "Operation completed",
        },
      };
      return cleanResponse;
    }
    return response;
  },
  (error) => {
    // Handle network errors
    if (!error.response) {
      toast.error("Network error. Please check your connection.");
      return Promise.reject({
        message: "Network error. Please check your connection.",
        status: 0,
      });
    }

    // Handle timeout errors
    if (error.code === "ECONNABORTED") {
      toast.error("Request timed out. Please try again later.");
      return Promise.reject({
        message: "Request timed out. Please try again later.",
        status: 408,
      });
    }

    // Handle server errors
    const errorResponse = error.response;

    // Extract the error message from the response
    const errorMessage =
      errorResponse.data?.error ||
      errorResponse.data?.message ||
      "An error occurred. Please try again.";

    // Show toast for client errors (4xx) that are not 401 (unauthorized)
    if (
      errorResponse.status >= 400 &&
      errorResponse.status < 500 &&
      errorResponse.status !== 401
    ) {
      toast.error(errorMessage);
    }

    // Show toast for server errors (5xx)
    if (errorResponse.status >= 500) {
      toast.error("Server error. Please try again later.");
    }

    return Promise.reject(errorResponse.data);
  }
);

export default api;
