// import { api } from "../lib/api";

// // Authentication API functions
// export const authAPI = {
//   // Register a new user
//   register: async (userData) => {
//     try {
//       const response = await api.post("/auth/register", userData);
//       if (response.data.token) {
//         localStorage.setItem("token", response.data.token);
//         localStorage.setItem("user", JSON.stringify(response.data));
//       }
//       return response.data;
//     } catch (error) {
//       throw error.response?.data || { message: "Registration failed" };
//     }
//   },

//   // Login user
//   login: async (credentials) => {
//     try {
//       const response = await api.post("/auth/login", credentials);
//       if (response.data.token) {
//         localStorage.setItem("token", response.data.token);
//         localStorage.setItem("user", JSON.stringify(response.data));
//       }
//       return response.data;
//     } catch (error) {
//       throw error.response?.data || { message: "Login failed" };
//     }
//   },

//   // Logout user
//   logout: () => {
//     localStorage.removeItem("token");
//     localStorage.removeItem("user");
//   },

//   // Get current user profile
//   getProfile: async () => {
//     try {
//       const response = await api.get("/auth/profile");
//       return response.data;
//     } catch (error) {
//       throw error.response?.data || { message: "Failed to fetch profile" };
//     }
//   },

//   // Update user profile
//   updateProfile: async (profileData) => {
//     try {
//       const response = await api.put("/auth/profile", profileData);
//       return response.data;
//     } catch (error) {
//       throw error.response?.data || { message: "Failed to update profile" };
//     }
//   },

//   // Check if user is authenticated
//   isAuthenticated: () => {
//     return !!localStorage.getItem("token");
//   },

//   // Get current user data
//   getCurrentUser: () => {
//     const user = localStorage.getItem("user");
//     return user ? JSON.parse(user) : null;
//   },
// };

// // Also export as default for backward compatibility
// export default authAPI;

import { api } from "../lib/api";

// Authentication API functions
export const authAPI = {
  // Register a new user
  register: async (userData) => {
    try {
      const response = await api.post("/auth/register", userData);
      const { token, user } = response.data; // Destructure token and user

      if (token && user) {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user)); // Store only the user object
        return { token, user }; // Return token and user
      } else {
        throw { message: "Invalid registration response" }; // Handle invalid response
      }
    } catch (error) {
      if (error.response && error.response.data) {
        throw error.response.data; // Throw server error
      } else {
        throw { message: "Registration failed", ...error }; // Throw generic error with details
      }
    }
  },

  // Login user
  login: async (credentials) => {
    try {
      const response = await api.post("/auth/login", credentials);
      const { token, user } = response.data; // Destructure token and user

      if (token && user) {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user)); // Store only the user object
        return { token, user }; // Return token and user
      } else {
        throw { message: "Invalid login response" }; // Handle invalid response
      }
    } catch (error) {
      if (error.response && error.response.data) {
        throw error.response.data; // Throw server error
      } else {
        throw { message: "Login failed", ...error }; // Throw generic error with details
      }
    }
  },

  // Logout user
  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },

  // Get current user profile
  getProfile: async () => {
    try {
      const response = await api.get("/auth/profile");
      const { user } = response.data; // Destructure the user from response.data

      if (user) {
        localStorage.setItem("user", JSON.stringify(user)); // Update local storage with the user only
        return { user }; // return the user object
      } else {
        throw { message: "Invalid profile response" }; // handle invalid response.
      }
    } catch (error) {
      if (error.response && error.response.data) {
        throw error.response.data; // Throw server error
      } else {
        throw { message: "Failed to fetch profile", ...error }; // Throw generic error with details
      }
    }
  },

  // Update user profile
  updateProfile: async (profileData) => {
    try {
      const response = await api.put("/auth/profile", profileData);
      const { user } = response.data; // Destructure the user from response.data.

      if(user){
        localStorage.setItem("user", JSON.stringify(user));
        return { user };
      } else{
        throw {message: "Invalid update profile response"}
      }

    } catch (error) {
      if (error.response && error.response.data) {
        throw error.response.data; // Throw server error
      } else {
        throw { message: "Failed to update profile", ...error }; // Throw generic error with details
      }
    }
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem("token");
  },

  // Get current user data
  getCurrentUser: () => {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  },
};

// Also export as default for backward compatibility
export default authAPI;