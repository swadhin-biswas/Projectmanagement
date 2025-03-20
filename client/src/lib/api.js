import axios from "/node_modules/.vite/deps/axios.js?v=f99fe3d9";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

// Cache configuration
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Create axios instance with auth headers
const createAuthAxios = () => {
  const token = localStorage.getItem("token");
  return axios.create({
    baseURL: API_URL,
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
      "Content-Type": "application/json",
    },
  });
};

// Create initial API instance
let api = createAuthAxios();

// Request interceptor to refresh auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for caching and error handling
api.interceptors.response.use(
  (response) => {
    // Cache GET requests
    if (response.config.method === "get") {
      const cacheKey = `${response.config.url}${JSON.stringify(
        response.config.params || {}
      )}`;
      cache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now(),
      });
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Clear token on auth error
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
    return Promise.reject(error);
  }
);

// Helper function to get cached data
export const getCachedData = (url, params = {}) => {
  const cacheKey = `${url}${JSON.stringify(params)}`;
  const cachedItem = cache.get(cacheKey);

  if (cachedItem && Date.now() - cachedItem.timestamp < CACHE_DURATION) {
    return cachedItem.data;
  }

  return null;
};

// Helper function to clear cache
export const clearCache = () => {
  cache.clear();
};

// Cached API calls
export const apiCache = {
  async get(endpoint, params = {}) {
    const cacheKey = `${endpoint}${JSON.stringify(params)}`;
    const cached = cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    const response = await api.get(endpoint, { params });
    cache.set(cacheKey, {
      data: response.data,
      timestamp: Date.now(),
    });
    return response.data;
  },

  async post(endpoint, data) {
    const response = await api.post(endpoint, data);
    // Invalidate related GET caches
    this.invalidateRelated(endpoint);
    return response.data;
  },

  async put(endpoint, data) {
    const response = await api.put(endpoint, data);
    this.invalidateRelated(endpoint);
    return response.data;
  },

  async delete(endpoint) {
    const response = await api.delete(endpoint);
    this.invalidateRelated(endpoint);
    return response.data;
  },

  invalidateRelated(endpoint) {
    const basePath = endpoint.split("/")[1]; // e.g., 'users' from '/users/123'
    for (const key of cache.keys()) {
      if (key.includes(basePath)) {
        cache.delete(key);
      }
    }
  },

  clearCache() {
    cache.clear();
  },
};

// Export the base api instance
export { api };

// Auth API methods
const authAPI = {
  isAuthenticated() {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");
    return !!(token && user);
  },

  async login(credentials) {
    try {
      const response = await api.post("/auth/login", credentials);
      const { token, user } = response.data;
      if (!token || !user || !user.role) {
        throw new Error("Invalid response from server");
      }
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      // Refresh axios instance after token update
      api = createAuthAxios();
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Login failed");
    }
  },

  async register(userData) {
    try {
      const response = await api.post("/auth/register", userData);
      const { token, user } = response.data;
      if (!token || !user || !user.role) {
        throw new Error("Invalid response from server");
      }
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      // Refresh axios instance after token update
      api = createAuthAxios();
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Registration failed");
    }
  },

  async getProfile() {
    try {
      if (!this.isAuthenticated()) {
        throw new Error("Not authenticated");
      }
      const response = await api.get("/auth/profile");
      // Update stored user data
      localStorage.setItem("user", JSON.stringify(response.data.user));
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        this.logout();
      }
      throw new Error(error.response?.data?.message || "Failed to fetch profile");
    }
  },

  async updateProfile(profileData) {
    try {
      if (!this.isAuthenticated()) {
        throw new Error("Not authenticated");
      }
      const response = await api.put("/auth/profile", profileData);
      // Update stored user data
      localStorage.setItem("user", JSON.stringify(response.data.user));
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to update profile");
    }
  },

  logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    // Refresh axios instance after token removal
    api = createAuthAxios();
    // Clear any cached data
    apiCache.clearCache();
  },

  getUser() {
    return JSON.parse(localStorage.getItem("user") || "null");
  }
};

export default authAPI;
