import { clearAuthToken, getAuthToken, setAuthToken } from "@/lib/api";
import axios from "axios";

// Cache keys - should match those in AuthContext
const CACHE_KEYS = {
  TOKEN: "auth_token",
  USER: "user",
  AUTH_DATA: "auth_data",
};

// Create a single axios instance for all API calls
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:30000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Function to sync token from localStorage to the axios instance headers
const syncTokenFromStorage = () => {
  const token = getAuthToken();
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
};

// Add request interceptor for auth calls
api.interceptors.request.use(
  (config) => {
    syncTokenFromStorage(); // Ensure token is set before each request
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle token expiry
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // If this is a 401 error, we need to check if we should handle it
    if (error.response?.status === 401) {
      // Skip 401 handling if we just logged in (checking session storage)
      const justLoggedIn = sessionStorage.getItem("just_logged_in") === "true";

      if (justLoggedIn) {
        // Clear the flag after using it
        console.log("Ignoring 401 error because user just logged in");
        sessionStorage.removeItem("just_logged_in");
        return Promise.reject(error);
      }

      // Get the current time to check for grace period
      const currentTime = Date.now();
      const lastLoginTime = parseInt(
        localStorage.getItem("last_login_time") || "0"
      );
      const isWithinLoginGracePeriod = currentTime - lastLoginTime < 30000; // 30 second grace period

      // If it's a 401 and we're not in grace period, handle session expiry
      if (!isWithinLoginGracePeriod) {
        console.warn(
          "Session expired:",
          error.response?.data?.error || "Unauthorized"
        );

        // Only clear auth data if we get a clear session expired message
        // or if we're absolutely sure it's an auth issue
        if (
          error.response?.data?.error?.includes("expired") ||
          error.response?.data?.error?.includes("invalid token") ||
          error.response?.data?.error?.includes("unauthorized")
        ) {
          // Token expired or invalid
          clearAuthToken(); // Use centralized function instead of individual removals

          // Use location.replace to avoid adding to history stack
          window.location.replace("/login?session=expired");
        }
      }
    }

    return Promise.reject(error);
  }
);

const registerUser = async (userData) => {
  try {
    const response = await api.post("/api/auth/register", userData);
    if (response.data.success) {
      // Store auth data on successful registration
      setAuthToken(response.data.token);
      localStorage.setItem(CACHE_KEYS.USER, JSON.stringify(response.data.user));
      localStorage.setItem(CACHE_KEYS.AUTH_DATA, JSON.stringify(response.data));

      // Set last login time for grace period
      localStorage.setItem("last_login_time", Date.now().toString());

      // Set flag that we just logged in (to prevent immediate 401 handling)
      sessionStorage.setItem("just_logged_in", "true");

      syncTokenFromStorage();
      return response.data;
    }
    return {
      success: false,
      error: response.data.error || "Registration failed",
    };
  } catch (error) {
    if (error.response?.data) {
      return error.response.data;
    }
    return {
      success: false,
      error: error.message || "Registration failed",
    };
  }
};

const loginUser = async (credentials) => {
  try {
    const response = await api.post("/api/auth/login", credentials);
    if (response.data.success) {
      // Store auth data on successful login
      setAuthToken(response.data.token);
      localStorage.setItem(CACHE_KEYS.USER, JSON.stringify(response.data.user));
      localStorage.setItem(CACHE_KEYS.AUTH_DATA, JSON.stringify(response.data));

      // Set last login time for grace period
      localStorage.setItem("last_login_time", Date.now().toString());

      // Set flag that we just logged in (to prevent immediate 401 handling)
      sessionStorage.setItem("just_logged_in", "true");

      syncTokenFromStorage();
      return response.data;
    }
    return response.data;
  } catch (error) {
    if (error.response?.data) {
      return error.response.data;
    }
    return {
      success: false,
      error: error.message || "Login failed",
    };
  }
};

const logoutUser = () => {
  clearAuthToken();
  return { success: true };
};

const getUserProfile = async () => {
  try {
    const response = await api.get("/api/auth/profile");
    if (response.data.success) {
      // Update stored user data
      localStorage.setItem(CACHE_KEYS.USER, JSON.stringify(response.data.data));
      return response.data;
    }
    return response.data;
  } catch (error) {
    if (error.response?.data) {
      return error.response.data;
    }
    return {
      success: false,
      error: error.message || "Failed to get user profile",
    };
  }
};

const updateUserProfile = async (profileData) => {
  try {
    const response = await api.put("/api/auth/profile", profileData);
    if (response.data.success) {
      // Update stored user data
      localStorage.setItem(CACHE_KEYS.USER, JSON.stringify(response.data.data));
      return response.data;
    }
    return response.data;
  } catch (error) {
    if (error.response?.data) {
      return error.response.data;
    }
    return {
      success: false,
      error: error.message || "Failed to update profile",
    };
  }
};

export const authAPI = {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  logoutUser,
  syncTokenFromStorage,
};

export {
  getUserProfile,
  loginUser,
  logoutUser,
  registerUser,
  syncTokenFromStorage,
  updateUserProfile,
};
