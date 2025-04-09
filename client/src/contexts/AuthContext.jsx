import { authAPI } from "@/api/auth"; // Import authAPI
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
  AUTH_DATA: "auth_data",
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
  const [authData, setAuthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const clearAuth = useCallback(() => {
    localStorage.removeItem(CACHE_KEYS.TOKEN);
    localStorage.removeItem(CACHE_KEYS.USER);
    localStorage.removeItem(CACHE_KEYS.AUTH_DATA);
    setUser(null);
    setAuthData(null);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      if (!isMounted) return;
      setLoading(true);

      try {
        const token = localStorage.getItem(CACHE_KEYS.TOKEN);
        const storedUser = localStorage.getItem(CACHE_KEYS.USER);

        if (!token) {
          if (isMounted) clearAuth();
          return;
        }

        // If we have a token and stored user data, use it immediately
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            if (isMounted) {
              setUser(parsedUser);
              setAuthData({ token, user: parsedUser });
              setError(null);
              setLoading(false);
            }
          } catch (e) {
            console.error("Failed to parse stored user data:", e);
            if (isMounted) clearAuth();
          }
          return; // Skip server verification to avoid 401 issues
        }

        // Only verify with server if we don't have user data
        const response = await authAPI.getUserProfile();

        if (!isMounted) return;

        if (response?.success) {
          const freshUser = response.data;
          if (isMounted) {
            setUser(freshUser);
            setAuthData({ token, user: freshUser });
            setError(null);
          }
        } else {
          clearAuth();
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
        if (isMounted) clearAuth();
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, [clearAuth]);

  const login = async (credentials) => {
    setLoading(true);
    setError(null);
    try {
      const result = await authAPI.loginUser(credentials);
      if (result.success) {
        setUser(result.user);
        setAuthData(result);
        setError(null);
        toast.success("Welcome back!", {
          description: `Logged in as ${result.user.fullName}`,
        });
        return { success: true, user: result.user };
      } else {
        setError(result.error || "Login failed");
        return { success: false, error: result.error || "Login failed" };
      }
    } catch (error) {
      setError(error.message || "An unexpected error occurred during login.");
      return { success: false, error: error.message || "Login failed" };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await authAPI.registerUser(userData);
      if (result.success) {
        setUser(result.user);
        setAuthData(result);
        setError(null);
        toast.success("Registration successful!", {
          description: result.message || "Your account has been created.",
        });
        return { success: true, user: result.user };
      } else {
        setError(result.error || "Registration failed");
        return { success: false, error: result.error || "Registration failed" };
      }
    } catch (error) {
      setError(
        error.message || "An unexpected error occurred during registration."
      );
      return { success: false, error: error.message || "Registration failed" };
    } finally {
      setLoading(false);
    }
  };

  const logout = useCallback(() => {
    clearAuth();
    authAPI.logoutUser();
    navigate("/login");
    toast.success("Logged out successfully");
  }, [clearAuth, navigate]);

  const value = {
    user,
    authData,
    loading,
    error,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
