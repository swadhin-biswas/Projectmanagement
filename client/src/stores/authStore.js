import { loginUser, logoutUser, refreshToken } from "@/api/auth";
import { create } from "zustand";

const CACHE_KEYS = {
  TOKEN: "auth_token",
  USER: "user",
  AUTH_DATA: "auth_data",
};

const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem(CACHE_KEYS.USER)) || null,
  authData: JSON.parse(localStorage.getItem(CACHE_KEYS.AUTH_DATA)) || null,
  isAuthenticated: !!localStorage.getItem(CACHE_KEYS.TOKEN),
  isLoading: false,
  error: null,

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const response = await loginUser(credentials);

      // Store all auth data
      localStorage.setItem(CACHE_KEYS.TOKEN, response.token);
      localStorage.setItem(CACHE_KEYS.USER, JSON.stringify(response.user));
      localStorage.setItem(CACHE_KEYS.AUTH_DATA, JSON.stringify(response));

      set({
        user: response.user,
        authData: response,
        isAuthenticated: true,
        isLoading: false,
      });
      return response;
    } catch (error) {
      set({
        error: error.message || "Login failed",
        isLoading: false,
      });
      throw error;
    }
  },

  logout: () => {
    // Clear localStorage items
    localStorage.removeItem(CACHE_KEYS.TOKEN);
    localStorage.removeItem(CACHE_KEYS.USER);
    localStorage.removeItem(CACHE_KEYS.AUTH_DATA);

    logoutUser();
    set({
      user: null,
      authData: null,
      isAuthenticated: false,
      error: null,
    });
  },

  refreshAuth: async () => {
    try {
      const response = await refreshToken();
      set({
        isAuthenticated: true,
        error: null,
      });
      return response;
    } catch (error) {
      set({
        isAuthenticated: false,
        error: error.message || "Token refresh failed",
      });
      throw error;
    }
  },
}));

export default useAuthStore;
