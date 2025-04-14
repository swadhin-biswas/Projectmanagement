import { api } from "../lib/api";

/**
 * Comprehensive Team API service with role-based endpoints
 */
export const teamAPI = {
  common: {
    getTeam: async (teamId) => {
      try {
        const response = await api.get(`/student-teams/${teamId}`);
        return response.data.data; // Extract data from structured response
      } catch (error) {
        throw (
          error.response?.data?.error || {
            message: "Failed to fetch team details",
          }
        );
      }
    },

    getMyTeams: async () => {
      try {
        const response = await api.get("/student-teams");
        return response.data.data;
      } catch (error) {
        throw (
          error.response?.data?.error || {
            message: "Failed to fetch your teams",
          }
        );
      }
    },

    chat: {
      getMessages: async (teamId, { limit = 50, before = null } = {}) => {
        try {
          const params = new URLSearchParams();
          if (limit) params.append("limit", limit);
          if (before) params.append("before", before);
          const response = await api.get(
            `/student-teams/${teamId}/chat?${params}`
          );
          return response.data.data;
        } catch (error) {
          throw (
            error.response?.data?.error || {
              message: "Failed to fetch messages",
            }
          );
        }
      },

      sendMessage: async (teamId, data) => {
        try {
          const response = await api.post(
            `/student-teams/${teamId}/chat`,
            data
          );
          return response.data.data;
        } catch (error) {
          throw (
            error.response?.data?.error || { message: "Failed to send message" }
          );
        }
      },

      // These endpoints aren't in studentTeamRoutes.js - might need separate implementation
      getUnreadCount: async (teamId) => {
        try {
          const response = await api.get(`/teams/${teamId}/chat/unread`);
          return response.data.data;
        } catch (error) {
          throw (
            error.response?.data?.error || {
              message: "Failed to get unread count",
            }
          );
        }
      },

      markMessagesAsRead: async (teamId, messageIds) => {
        try {
          const response = await api.post(`/teams/${teamId}/chat/mark-read`, {
            messageIds,
          });
          return response.data.data;
        } catch (error) {
          throw (
            error.response?.data?.error || {
              message: "Failed to mark messages as read",
            }
          );
        }
      },

      getAnnouncements: async (teamId) => {
        try {
          const response = await api.get(`/teams/${teamId}/chat/announcements`);
          return response.data.data;
        } catch (error) {
          throw (
            error.response?.data?.error || {
              message: "Failed to fetch announcements",
            }
          );
        }
      },
    },
  },

  student: {
    getCurrentTeam: async () => {
      try {
        const response = await api.get("/api/student/team");
        return response.data;
      } catch (error) {
        throw (
          error.response?.data?.error || {
            message: "Failed to fetch your team",
          }
        );
      }
    },

    createTeam: async (data) => {
      try {
        const response = await api.post("/api/student/team/create", data);
        return response.data;
      } catch (error) {
        throw (
          error.response?.data?.error || { message: "Failed to create team" }
        );
      }
    },

    leaveTeam: async (teamId) => {
      try {
        const response = await api.post("/api/student/team/leave-team");
        return response.data;
      } catch (error) {
        throw (
          error.response?.data?.error || { message: "Failed to leave team" }
        );
      }
    },

    getPendingInvites: async () => {
      try {
        const response = await api.get("/api/student/team/invitations");
        return response.data;
      } catch (error) {
        throw (
          error.response?.data?.error || {
            message: "Failed to fetch invitations",
          }
        );
      }
    },

    inviteStudent: async (teamId, data) => {
      try {
        const response = await api.post("/api/student/team/invite", data);
        return response.data;
      } catch (error) {
        throw (
          error.response?.data?.error || {
            message: "Failed to send invitation",
          }
        );
      }
    },

    respondToInvite: async (teamId, action) => {
      try {
        const response = await api.post(
          "/api/student/team/respond-to-invitation",
          {
            teamId,
            response: action,
          }
        );
        return response.data;
      } catch (error) {
        throw (
          error.response?.data?.error || {
            message: "Failed to respond to invitation",
          }
        );
      }
    },

    getAvailableStudents: async () => {
      try {
        const response = await api.get("/api/student/team/available-students");
        return response.data;
      } catch (error) {
        throw (
          error.response?.data?.error || {
            message: "Failed to fetch available students",
          }
        );
      }
    },
  },

  supervisor: {
    getSupervisedTeams: async () => {
      try {
        const response = await api.get("/supervisor/teams");
        return response.data.data;
      } catch (error) {
        throw (
          error.response?.data?.error || {
            message: "Failed to fetch supervised teams",
          }
        );
      }
    },

    getTeamDetails: async (teamId) => {
      try {
        const response = await api.get(`/supervisor/teams/${teamId}`);
        return response.data.data;
      } catch (error) {
        throw (
          error.response?.data?.error || {
            message: "Failed to fetch team details",
          }
        );
      }
    },

    updateTeamProgress: async (teamId, data) => {
      try {
        const response = await api.put(
          `/supervisor/teams/${teamId}/progress`,
          data
        );
        return response.data.data;
      } catch (error) {
        throw (
          error.response?.data?.error || {
            message: "Failed to update team progress",
          }
        );
      }
    },
  },

  admin: {
    getAllTeams: async (filters = {}) => {
      try {
        const params = new URLSearchParams(filters);
        const url = `/admin/teams${params.toString() ? `?${params}` : ""}`;
        const response = await api.get(url);
        return response.data.data;
      } catch (error) {
        throw (
          error.response?.data?.error || { message: "Failed to fetch teams" }
        );
      }
    },

    assignSupervisor: async (teamId, data) => {
      try {
        const response = await api.post(
          `/teams/${teamId}/assign-supervisor`,
          data
        );
        return response.data.data;
      } catch (error) {
        throw (
          error.response?.data?.error || {
            message: "Failed to assign supervisor",
          }
        );
      }
    },

    getTeamsWithoutSupervisors: async (sessionId) => {
      try {
        const params = sessionId ? `?sessionId=${sessionId}` : "";
        const response = await api.get(
          `/admin/teams/without-supervisors${params}`
        );
        return response.data.data;
      } catch (error) {
        throw (
          error.response?.data?.error || {
            message: "Failed to fetch teams without supervisors",
          }
        );
      }
    },
  },
};

// Compatibility layer
export const getUserTeam = () => teamAPI.student.getCurrentTeam();
export const createTeam = (teamData) => teamAPI.student.createTeam(teamData);
export const inviteToTeam = (teamId, studentId) =>
  teamAPI.student.inviteStudent(teamId, { studentId });
export const getInvitations = () => teamAPI.student.getPendingInvites();
export const respondToInvitation = (teamId, action) =>
  teamAPI.student.respondToInvite(teamId, action);
export const leaveTeam = (teamId) => teamAPI.student.leaveTeam(teamId);
export const getAvailableStudents = () =>
  teamAPI.student.getAvailableStudents();

// Updated removeMember to match typical REST conventions
export const removeMember = (teamId, memberId) => {
  return api
    .post(`/student-teams/${teamId}/remove-member`, { memberId })
    .then((response) => response.data.data)
    .catch((error) => {
      throw (
        error.response?.data?.error || { message: "Failed to remove member" }
      );
    });
};

export default teamAPI;
