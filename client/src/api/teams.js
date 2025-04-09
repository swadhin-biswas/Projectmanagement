import { api } from "../lib/api";

/**
 * Comprehensive Team API service with role-based endpoints
 *
 * This service provides access to all team-related endpoints,
 * organized by user role (common, student, supervisor, admin)
 * for better clarity and to avoid endpoint duplication.
 */
export const teamAPI = {
  // Common team operations (available to all roles)
  common: {
    // Get a specific team by ID
    getTeam: async (teamId) => {
      try {
        const response = await api.get(`/api/teams/${teamId}`);
        return response.data;
      } catch (error) {
        throw (
          error.response?.data || { message: "Failed to fetch team details" }
        );
      }
    },

    // Get all teams the current user is part of
    getMyTeams: async () => {
      try {
        const response = await api.get("/api/teams/my-teams");
        return response.data;
      } catch (error) {
        throw error.response?.data || { message: "Failed to fetch your teams" };
      }
    },

    // Team chat operations
    chat: {
      getMessages: async (teamId, { limit = 50, before = null } = {}) => {
        try {
          const params = new URLSearchParams();
          if (limit) params.append("limit", limit);
          if (before) params.append("before", before);
          const response = await api.get(`/api/teams/${teamId}/chat?${params}`);
          return response.data;
        } catch (error) {
          throw error.response?.data || { message: "Failed to fetch messages" };
        }
      },

      sendMessage: async (teamId, data) => {
        try {
          const response = await api.post(`/api/teams/${teamId}/chat`, data);
          return response.data;
        } catch (error) {
          throw error.response?.data || { message: "Failed to send message" };
        }
      },

      getUnreadCount: async (teamId) => {
        try {
          const response = await api.get(`/api/teams/${teamId}/chat/unread`);
          return response.data;
        } catch (error) {
          throw (
            error.response?.data || { message: "Failed to get unread count" }
          );
        }
      },

      markMessagesAsRead: async (teamId, messageIds) => {
        try {
          const response = await api.post(
            `/api/teams/${teamId}/chat/mark-read`,
            {
              messageIds,
            }
          );
          return response.data;
        } catch (error) {
          throw (
            error.response?.data || {
              message: "Failed to mark messages as read",
            }
          );
        }
      },

      getAnnouncements: async (teamId) => {
        try {
          const response = await api.get(
            `/api/teams/${teamId}/chat/announcements`
          );
          return response.data;
        } catch (error) {
          throw (
            error.response?.data || { message: "Failed to fetch announcements" }
          );
        }
      },
    },
  },

  // Student-specific team operations
  student: {
    // Get the current student's team
    getCurrentTeam: async () => {
      try {
        const response = await api.get("/api/student/teams");
        return response.data;
      } catch (error) {
        throw error.response?.data || { message: "Failed to fetch your team" };
      }
    },

    // Create a new team
    createTeam: async (data) => {
      try {
        const response = await api.post("/api/student/teams/create", data);
        return response.data;
      } catch (error) {
        throw error.response?.data || { message: "Failed to create team" };
      }
    },

    // Leave the current team
    leaveTeam: async (teamId) => {
      try {
        const response = await api.delete(`/api/student/teams/${teamId}/leave`);
        return response.data;
      } catch (error) {
        throw error.response?.data || { message: "Failed to leave team" };
      }
    },

    // Get pending invitations
    getPendingInvites: async () => {
      try {
        const response = await api.get("/api/student/teams/invitations");
        return response.data;
      } catch (error) {
        throw (
          error.response?.data || { message: "Failed to fetch invitations" }
        );
      }
    },

    // Invite a student to join team
    inviteStudent: async (teamId, data) => {
      try {
        const response = await api.post(
          `/api/student/teams/${teamId}/invite`,
          data
        );
        return response.data;
      } catch (error) {
        throw error.response?.data || { message: "Failed to send invitation" };
      }
    },

    // Respond to team invitation
    respondToInvite: async (teamId, action) => {
      try {
        const response = await api.post(
          `/api/student/teams/${teamId}/respond`,
          {
            response: action, // 'accepted' or 'declined'
          }
        );
        return response.data;
      } catch (error) {
        throw (
          error.response?.data || { message: "Failed to respond to invitation" }
        );
      }
    },

    // Get available students for invite
    getAvailableStudents: async () => {
      try {
        const response = await api.get("/api/student/available-students");
        return response.data;
      } catch (error) {
        throw (
          error.response?.data || {
            message: "Failed to fetch available students",
          }
        );
      }
    },
  },

  // Supervisor-specific team operations
  supervisor: {
    // Get teams supervised by current user
    getSupervisedTeams: async () => {
      try {
        const response = await api.get("/api/supervisor/teams");
        return response.data;
      } catch (error) {
        throw (
          error.response?.data || {
            message: "Failed to fetch supervised teams",
          }
        );
      }
    },

    // Get specific team details with full info
    getTeamDetails: async (teamId) => {
      try {
        const response = await api.get(`/api/supervisor/teams/${teamId}`);
        return response.data;
      } catch (error) {
        throw (
          error.response?.data || { message: "Failed to fetch team details" }
        );
      }
    },

    // Update team progress
    updateTeamProgress: async (teamId, data) => {
      try {
        const response = await api.put(
          `/api/supervisor/teams/${teamId}/progress`,
          data
        );
        return response.data;
      } catch (error) {
        throw (
          error.response?.data || { message: "Failed to update team progress" }
        );
      }
    },
  },

  // Admin-specific team operations
  admin: {
    // Get all teams (with filtering options)
    getAllTeams: async (filters = {}) => {
      try {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, value);
          }
        });
        const query = params.toString();
        const url = `/api/admin/teams${query ? `?${query}` : ""}`;
        const response = await api.get(url);
        return response.data;
      } catch (error) {
        throw error.response?.data || { message: "Failed to fetch teams" };
      }
    },

    // Assign supervisor to team
    assignSupervisor: async (teamId, data) => {
      try {
        const response = await api.post(
          `/api/teams/${teamId}/assign-supervisor`,
          data
        );
        return response.data;
      } catch (error) {
        throw (
          error.response?.data || { message: "Failed to assign supervisor" }
        );
      }
    },

    // Get teams without supervisors
    getTeamsWithoutSupervisors: async (sessionId) => {
      try {
        const params = sessionId ? `?sessionId=${sessionId}` : "";
        const response = await api.get(
          `/api/admin/teams/without-supervisors${params}`
        );
        return response.data;
      } catch (error) {
        throw (
          error.response?.data || {
            message: "Failed to fetch teams without supervisors",
          }
        );
      }
    },
  },
};

/**
 * COMPATIBILITY LAYER
 * These individual exports maintain backward compatibility with existing code
 * while we transition to the new structured API above.
 *
 * For new code, prefer using the teamAPI object structure above.
 */

// Get the current user's team information
export const getUserTeam = () => {
  return teamAPI.student.getCurrentTeam();
};

// Create a new team
export const createTeam = (teamData) => {
  return teamAPI.student.createTeam(teamData);
};

// Send an invitation to join a team
export const inviteToTeam = (studentId) => {
  const teamId = localStorage.getItem("currentTeamId"); // Assuming we store the current team ID
  return teamAPI.student.inviteStudent(teamId, { studentId });
};

// Get pending invitations for the current user
export const getInvitations = () => {
  return teamAPI.student.getPendingInvites();
};

// Respond to a team invitation
export const respondToInvitation = (invitationId, action) => {
  return teamAPI.student.respondToInvite(invitationId, action);
};

// Remove a member from the team (team leader only)
export const removeMember = (memberId) => {
  const teamId = localStorage.getItem("currentTeamId");
  return api.post(`/api/teams/${teamId}/remove-member`, { memberId });
};

// Leave the current team
export const leaveTeam = () => {
  const teamId = localStorage.getItem("currentTeamId");
  return teamAPI.student.leaveTeam(teamId);
};

// Get all students available for invitation
export const getAvailableStudents = () => {
  return teamAPI.student.getAvailableStudents();
};

export default teamAPI;
