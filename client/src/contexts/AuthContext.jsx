// AuthContext.jsx
import { loginUser, registerUser } from "@/api/auth";
import { api, invalidateCache } from "@/lib/api";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const CACHE_KEYS = {
  TOKEN: "token",
  USER: "user",
  THEME: "theme",
  PREFERENCES: "preferences",
};

export const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastTokenCheck, setLastTokenCheck] = useState(0);
  const navigate = useNavigate();

  const clearAuth = useCallback(() => {
    localStorage.removeItem(CACHE_KEYS.TOKEN);
    localStorage.removeItem(CACHE_KEYS.USER);
    setUser(null);
    setError(null);
    delete api.defaults.headers.common["Authorization"];
  }, []);

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem(CACHE_KEYS.TOKEN);
      const cachedUser = localStorage.getItem(CACHE_KEYS.USER);

      if (token && cachedUser) {
        try {
          // Use cached user data initially
          setUser(JSON.parse(cachedUser));
          api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

          // Check token validity if it hasn't been checked recently (5 minutes)
          const now = Date.now();
          if (now - lastTokenCheck > 5 * 60 * 1000) {
            const response = await api.get("/api/auth/profile", {
              noCache: true,
            });
            if (response.data?.success) {
              setUser(response.data.user);
              localStorage.setItem(
                CACHE_KEYS.USER,
                JSON.stringify(response.data.user)
              );
              setLastTokenCheck(now);
            }
          }
        } catch (error) {
          // Only clear auth if it's an auth-related error
          if (error.response?.status === 401) {
            clearAuth();
          }
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, [clearAuth, lastTokenCheck]);

  const login = async (credentials) => {
    try {
      setLoading(true);
      setError(null);

      const result = await loginUser(credentials);

      if (result.success) {
        // Set auth token
        api.defaults.headers.common["Authorization"] = `Bearer ${result.token}`;
        localStorage.setItem(CACHE_KEYS.TOKEN, result.token);
        localStorage.setItem(CACHE_KEYS.USER, JSON.stringify(result.user));
        setUser(result.user);
        setLastTokenCheck(Date.now());

        toast.success("Welcome back!", {
          description: `Logged in as ${result.user.fullName}`,
        });

        return { success: true, user: result.user };
      } else {
        setError(result.error);
        toast.error("Login failed", {
          description: result.error,
        });
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message;
      setError(errorMessage);
      toast.error("Login failed", {
        description: errorMessage,
      });
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);

      const result = await registerUser(userData);

      if (result.success) {
        // Set auth token
        api.defaults.headers.common["Authorization"] = `Bearer ${result.token}`;
        localStorage.setItem(CACHE_KEYS.TOKEN, result.token);
        localStorage.setItem(CACHE_KEYS.USER, JSON.stringify(result.user));
        setUser(result.user);
        setLastTokenCheck(Date.now());

        return { success: true, user: result.user };
      }

      // Handle registration failure
      const errorMessage = result.error || "Registration failed";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } catch (error) {
      let errorMessage = "Registration failed";
      let field = null;

      if (error.response?.data) {
        errorMessage = error.response.data.error || errorMessage;
        field = error.response.data.field;
      }

      setError(errorMessage);
      return { success: false, error: errorMessage, field };
    } finally {
      setLoading(false);
    }
  };

  const logout = useCallback(() => {
    // Invalidate all cached API responses
    invalidateCache(".*");
    clearAuth();
    navigate("/login");
    toast.success("Logged out successfully");
  }, [clearAuth, navigate]);

  const refreshUserData = useCallback(async () => {
    try {
      const response = await api.get("/auth/profile", { noCache: true });
      const responseData = response.data;

      // Handle different response structures
      let userData;

      if (responseData.success === true && responseData.user) {
        userData = responseData.user;
      } else if (
        responseData.success === true &&
        responseData.data &&
        responseData.data.user
      ) {
        userData = responseData.data.user;
      } else {
        return {
          success: false,
          error: responseData.error || "Failed to refresh user data",
        };
      }

      setUser(userData);
      localStorage.setItem(CACHE_KEYS.USER, JSON.stringify(userData));
      setLastTokenCheck(Date.now());
      return { success: true, user: userData };
    } catch (error) {
      console.error("Refresh user data error:", error);
      // Only clear auth if it's an auth-related error
      if (error.response?.status === 401) {
        clearAuth();
      }
      return { success: false, error: error.message };
    }
  }, [clearAuth]);

  const updateProfile = async (profileData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.put("/auth/profile", profileData);
      const responseData = response.data;

      // Handle both response formats
      if (responseData.success === false) {
        throw new Error(responseData.error || "Failed to update profile");
      }

      // Extract user data, handling different response structures
      let updatedUser;

      if (responseData.user) {
        // Direct structure: { user }
        updatedUser = responseData.user;
      } else if (responseData.data && responseData.data.user) {
        // Nested structure: { data: { user } }
        updatedUser = responseData.data.user;
      } else {
        throw new Error("Invalid response structure from server");
      }

      setUser(updatedUser);
      localStorage.setItem(CACHE_KEYS.USER, JSON.stringify(updatedUser));

      toast.success("Profile updated successfully");
      return { success: true, user: updatedUser };
    } catch (error) {
      console.error("Profile update error:", error);
      const errorMessage = error.response?.data?.error || error.message;
      setError(errorMessage);
      toast.error("Failed to update profile", {
        description: errorMessage,
      });
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile,
    refreshUserData,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin" || user?.role === "super_admin",
    isSupervisor: user?.role === "supervisor",
    isStudent: user?.role === "student",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
