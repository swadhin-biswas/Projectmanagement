import { api } from "../lib/api";

export const teamAPI = {
  // Team Management
  getTeam: async (teamId) => {
    try {
      const response = await api.get(`/api/teams/${teamId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Failed to fetch team details" };
    }
  },

  createTeam: async (data) => {
    try {
      const response = await api.post("/api/teams", data);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Failed to create team" };
    }
  },

  // Team Members
  getTeamMembers: async (teamId) => {
    try {
      const response = await api.get(`/api/teams/${teamId}/members`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Failed to fetch team members" };
    }
  },

  sendInvite: async (teamId, data) => {
    try {
      const response = await api.post(`/api/teams/${teamId}/invite`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Failed to send invitation" };
    }
  },

  respondToInvite: async (teamId, inviteId, response) => {
    try {
      const res = await api.post(
        `/api/teams/${teamId}/invite/${inviteId}/respond`,
        { response }
      );
      return res.data;
    } catch (error) {
      throw (
        error.response?.data || { message: "Failed to respond to invitation" }
      );
    }
  },

  leaveTeam: async (teamId) => {
    try {
      const response = await api.delete(`/api/teams/${teamId}/leave`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Failed to leave team" };
    }
  },

  // Team Chat
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
      throw error.response?.data || { message: "Failed to get unread count" };
    }
  },

  markMessagesAsRead: async (teamId, messageIds) => {
    try {
      const response = await api.post(`/api/teams/${teamId}/chat/mark-read`, {
        messageIds,
      });
      return response.data;
    } catch (error) {
      throw (
        error.response?.data || { message: "Failed to mark messages as read" }
      );
    }
  },

  // Team Announcements
  getAnnouncements: async (teamId) => {
    try {
      const response = await api.get(`/api/teams/${teamId}/chat/announcements`);
      return response.data;
    } catch (error) {
      throw (
        error.response?.data || { message: "Failed to fetch announcements" }
      );
    }
  },
};

export default teamAPI;

/**
 * Get the current user's team information
 * @returns {Promise} The API response
 */
export const getUserTeam = () => {
  return api.get("/api/student/team");
};

/**
 * Create a new team
 * @param {Object} teamData - Team data containing name and description
 * @returns {Promise} The API response
 */
export const createTeam = (teamData) => {
  return api.post("/api/student/create-team", teamData);
};

/**
 * Send an invitation to join a team
 * @param {string} studentId - The student ID to invite
 * @returns {Promise} The API response
 */
export const inviteToTeam = (studentId) => {
  return api.post("/api/student/invite-to-team", { studentId });
};

/**
 * Get pending invitations for the current user
 * @returns {Promise} The API response with pending invitations
 */
export const getInvitations = () => {
  return api.get("/api/student/invitations");
};

/**
 * Respond to a team invitation
 * @param {string} invitationId - The invitation ID
 * @param {boolean} accept - Whether to accept the invitation
 * @returns {Promise} The API response
 */
export const respondToInvitation = (invitationId, action) => {
  return api.post(`/api/student/respond-to-invitation`, {
    invitationId,
    action, // 'accept' or 'decline'
  });
};

/**
 * Remove a member from the team (team leader only)
 * @param {string} memberId - The member ID to remove
 * @returns {Promise} The API response
 */
export const removeMember = (memberId) => {
  return api.post("/api/student/remove-team-member", { memberId });
};

/**
 * Leave the current team
 * @returns {Promise} The API response
 */
export const leaveTeam = () => {
  return api.post("/api/student/leave-team");
};

/**
 * Get all students available for invitation
 * @returns {Promise} The API response with available students
 */
export const getAvailableStudents = () => {
  return api.get("/api/student/available-students");
};
