import React, { createContext, useContext, useEffect, useState } from "react";
import authAPI from "../lib/api"; // Ensure this file correctly exports API functions

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem("user");
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      console.error("Error parsing stored user:", error);
      return null;
    }
  });

  const [loading, setLoading] = useState(!user);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    }
  }, [user]);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (token && !user) {
      loadUserData();
    } else {
      setLoading(false);
    }
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const response = await authAPI.getProfile();

      if (!response || !response.user) {
        throw new Error("Invalid response format");
      }

      const userData = response.user;

      if (!userData || typeof userData !== "object") {
        throw new Error("Invalid user data format");
      }

      if (!userData.role) {
        console.warn("User data missing role, setting default 'student' role");
        userData.role = "student";
      }

      setUser(userData);
    } catch (error) {
      console.error("Auth error:", error.message || error);
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      setError("Authentication failed. Please login again.");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      setLoading(true);
      setError(null);

      const response = await authAPI.login(credentials);

      if (!response.success || !response.user || !response.token) {
        throw new Error("Invalid response data");
      }

      localStorage.setItem("authToken", response.token);
      setUser(response.user);

      return { success: true, user: response.user };
    } catch (error) {
      console.error("Login error:", error.message || error);
      setError(error.message || "Login failed. Please try again.");
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authAPI.register(userData);

      if (!response.success || !response.user || !response.token) {
        throw new Error("Invalid response data");
      }

      localStorage.setItem("authToken", response.token);
      setUser(response.user);

      return { success: true, user: response.user };
    } catch (error) {
      console.error("Registration error:", error.message || error);
      setError(error.message || "Registration failed. Please try again.");
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    setUser(null);
    setError(null);
  };

  const updateProfile = async (profileData) => {
    try {
      setLoading(true);
      setError(null);
      const updatedUser = await authAPI.updateProfile(profileData);
      setUser((prev) => ({ ...prev, ...updatedUser }));
      return updatedUser;
    } catch (error) {
      setError(error.message || "Profile update failed. Please try again.");
      return null;
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
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin" || user?.role === "superAdmin",
    isSupervisor: user?.role === "supervisor",
    isStudent: user?.role === "student",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
