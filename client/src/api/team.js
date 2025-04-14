import { isAuthenticated } from "../lib/api";
import apiClient from "../lib/apiClient";

/**
 * Team API service - handles all team-related operations
 * Uses the correct endpoints that match the server's StudentRoute
 */
const TeamAPI = {
  /**
   * Check if user is authenticated before making authenticated requests
   * @returns {boolean} True if user is authenticated
   */
  checkAuth() {
    return isAuthenticated();
  },

  /**
   * Get the current user's team information
   * Endpoint: GET /api/student/team
   */
  getTeam: async () => {
    try {
      const response = await apiClient.get("/api/student/team", {
        requiresAuth: true,
      });
      return response.data;
    } catch (error) {
      console.error("Failed to fetch team:", error);
      return {
        success: false,
        error: error.response?.data?.error || "Could not fetch team data",
        data: null,
      };
    }
  },

  /**
   * Create a new team
   * Endpoint: POST /api/student/team/create
   */
  createTeam: async (teamData) => {
    try {
      // Check authentication before attempting to create a team
      if (!isAuthenticated()) {
        console.warn("Attempting to create team without authentication");
      }

      const response = await apiClient.post(
        "/api/student/team/create",
        teamData,
        {
          requiresAuth: true,
        }
      );
      return response.data;
    } catch (error) {
      console.error("Failed to create team:", error);
      return {
        success: false,
        error:
          error.response?.status === 401
            ? "Authentication required to create a team"
            : error.response?.data?.error || "Failed to create team",
        data: null,
      };
    }
  },

  /**
   * Get list of available students for team invitations
   * Endpoint: GET /api/student/team/available-students
   */
  getAvailableStudents: async () => {
    try {
      const response = await apiClient.get(
        "/api/student/team/available-students",
        {
          requiresAuth: true,
        }
      );
      return response.data;
    } catch (error) {
      console.error("Failed to fetch available students:", error);
      return {
        success: false,
        error:
          error.response?.data?.error || "Could not fetch available students",
        data: { students: [] },
      };
    }
  },

  /**
   * Invite a student to join the team
   * Endpoint: POST /api/student/team/invite
   */
  inviteStudent: async (inviteData) => {
    try {
      // Ensure we're authenticated before trying to invite
      if (!isAuthenticated()) {
        return {
          success: false,
          error: "You must be logged in to invite students",
          data: null,
        };
      }

      const response = await apiClient.post(
        "/api/student/team/invite",
        inviteData,
        {
          requiresAuth: true,
        }
      );
      return response.data;
    } catch (error) {
      console.error("Failed to invite student:", error);
      return {
        success: false,
        error: error.response?.data?.error || "Failed to send invitation",
        data: null,
      };
    }
  },

  /**
   * Get pending team invitations for the current user
   * Endpoint: GET /api/student/team/invitations
   */
  getPendingInvitations: async () => {
    try {
      const response = await apiClient.get("/api/student/team/invitations", {
        requiresAuth: true,
      });
      return response.data;
    } catch (error) {
      console.error("Failed to fetch pending invitations:", error);
      return {
        success: false,
        error: error.response?.data?.error || "Could not fetch invitations",
        data: { invitations: [] },
      };
    }
  },

  /**
   * Respond to a team invitation (accept or decline)
   * Endpoint: POST /api/student/team/respond-to-invitation
   */
  respondToInvitation: async (responseData) => {
    try {
      // Ensure we're authenticated before trying to respond to invitations
      if (!isAuthenticated()) {
        return {
          success: false,
          error: "You must be logged in to respond to invitations",
          data: null,
        };
      }

      const response = await apiClient.post(
        "/api/student/team/respond-to-invitation",
        responseData,
        {
          requiresAuth: true,
        }
      );
      return response.data;
    } catch (error) {
      console.error("Failed to respond to invitation:", error);
      return {
        success: false,
        error: error.response?.data?.error || "Failed to respond to invitation",
        data: null,
      };
    }
  },

  /**
   * Remove a member from the team
   * Endpoint: POST /api/student/team/remove-member
   */
  removeMember: async (memberData) => {
    try {
      // Check authentication before attempting team member removal
      if (!isAuthenticated()) {
        return {
          success: false,
          error: "You must be logged in to remove team members",
          data: null,
        };
      }

      const response = await apiClient.post(
        "/api/student/team/remove-member",
        memberData,
        {
          requiresAuth: true,
        }
      );
      return response.data;
    } catch (error) {
      console.error("Failed to remove team member:", error);
      return {
        success: false,
        error: error.response?.data?.error || "Failed to remove team member",
        data: null,
      };
    }
  },

  /**
   * Leave the current team
   * Endpoint: POST /api/student/team/leave-team
   */
  leaveTeam: async () => {
    try {
      // Check authentication before attempting to leave team
      if (!isAuthenticated()) {
        return {
          success: false,
          error: "You must be logged in to leave a team",
          data: null,
        };
      }

      const response = await apiClient.post(
        "/api/student/team/leave-team",
        {},
        {
          requiresAuth: true,
        }
      );
      return response.data;
    } catch (error) {
      console.error("Failed to leave team:", error);
      return {
        success: false,
        error: error.response?.data?.error || "Failed to leave team",
        data: null,
      };
    }
  },
};

export default TeamAPI;
