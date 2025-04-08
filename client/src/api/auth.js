import axios from "axios";

// Create a separate axios instance for auth to avoid circular dependency with index.js
const authInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor for auth calls
authInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const registerUser = async (userData) => {
  try {
    const response = await authInstance.post("/api/auth/register", userData);
    if (response.data.success) {
      return response.data;
    }
    return {
      success: false,
      error: response.data.error || "Registration failed"
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
    const response = await authInstance.post("/api/auth/login", credentials);
    if (response.data.success) {
      return {
        success: true,
        token: response.data.token,
        user: response.data.user,
      };
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

const getUserProfile = async () => {
  try {
    const response = await authInstance.get("/api/auth/profile");
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.error || "Failed to fetch user profile"
    );
  }
};

const updateUserProfile = async (userData) => {
  try {
    const response = await authInstance.put("/api/auth/profile", userData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || "Failed to update profile");
  }
};

// Export all functions as a single API object
export const authAPI = {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
};

// Also export individual functions for direct imports
export { getUserProfile, loginUser, registerUser, updateUserProfile };
