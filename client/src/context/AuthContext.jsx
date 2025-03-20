import React, { createContext, useEffect, useState } from "react";
import { authAPI } from "../../api";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if token exists and load user data
    if (authAPI.isAuthenticated()) {
      loadUserData();
    } else {
      setLoading(false);
    }
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const userData = await authAPI.getProfile();
      setUser(userData);
    } catch (error) {
      authAPI.logout();
      setError(error.message || "Authentication failed. Please login again.");
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
      const userData = await authAPI.getProfile();
      setUser(userData);
      return response;
    } catch (error) {
      setError(error.message || "Login failed. Please try again.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authAPI.register(userData);
      const currentUser = await authAPI.getProfile();
      setUser(currentUser);
      return response;
    } catch (error) {
      setError(error.message || "Registration failed. Please try again.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authAPI.logout();
    setUser(null);
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
    isAuthenticated: authAPI.isAuthenticated(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
