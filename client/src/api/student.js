import api from "./index";

/**
 * Get student profile
 */
export const getStudentProfile = async () => {
  try {
    const response = await api.get("/api/student/profile");
    return response.data;
  } catch (error) {
    console.error("Error fetching student profile:", error);
    throw error;
  }
};

/**
 * Update student profile
 */
export const updateStudentProfile = async (data) => {
  try {
    const response = await api.put("/api/student/profile", data);
    return response.data;
  } catch (error) {
    console.error("Error updating student profile:", error);
    throw error;
  }
};

/**
 * Get user's team
 */
export const getUserTeam = async () => {
  try {
    const response = await api.get("/api/student/team");
    return response.data;
  } catch (error) {
    console.error("Error fetching user team:", error);
    throw error;
  }
};

/**
 * Create a new team
 */
export const createTeam = async (data) => {
  try {
    const response = await api.post("/api/student/team/create", data);
    return response.data;
  } catch (error) {
    console.error("Error creating team:", error);
    throw error;
  }
};

/**
 * Invite a user to join team
 */
export const inviteToTeam = async (data) => {
  try {
    const response = await api.post("/api/student/team/invite", data);
    return response.data;
  } catch (error) {
    console.error("Error inviting user to team:", error);
    throw error;
  }
};

/**
 * Get pending team invitations
 */
export const getPendingInvitations = async () => {
  try {
    const response = await api.get("/api/student/team/invitations");
    return response.data;
  } catch (error) {
    console.error("Error fetching pending invitations:", error);
    throw error;
  }
};

/**
 * Respond to team invitation
 */
export const respondToInvitation = async (data) => {
  try {
    const response = await api.post(
      "/api/student/team/respond-to-invitation",
      data
    );
    return response.data;
  } catch (error) {
    console.error("Error responding to invitation:", error);
    throw error;
  }
};

/**
 * Remove a member from team
 */
export const removeMember = async (data) => {
  try {
    const response = await api.post("/api/student/team/remove-member", data);
    return response.data;
  } catch (error) {
    console.error("Error removing team member:", error);
    throw error;
  }
};

/**
 * Leave the current team
 */
export const leaveTeam = async () => {
  try {
    const response = await api.post("/api/student/team/leave-team");
    return response.data;
  } catch (error) {
    console.error("Error leaving team:", error);
    throw error;
  }
};

/**
 * Get available students for team formation
 */
export const getAvailableStudents = async () => {
  try {
    const response = await api.get("/api/student/team/available-students");
    return response.data;
  } catch (error) {
    console.error("Error fetching available students:", error);
    throw error;
  }
};

/**
 * Create a new project
 */
export const createProject = async (data) => {
  try {
    const response = await api.post("/api/student/projects", data);
    return response.data;
  } catch (error) {
    console.error("Error creating project:", error);
    throw error;
  }
};

/**
 * Submit a project
 */
export const submitProject = async (projectId, data) => {
  try {
    const response = await api.post(
      `/api/student/projects/${projectId}/submit`,
      data
    );
    return response.data;
  } catch (error) {
    console.error("Error submitting project:", error);
    throw error;
  }
};

/**
 * Get project submissions
 */
export const getProjectSubmissions = async (projectId) => {
  try {
    const response = await api.get(
      `/api/student/projects/${projectId}/submissions`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching project submissions:", error);
    throw error;
  }
};

/**
 * Get student dashboard data
 */
export const getStudentDashboard = async () => {
  try {
    const response = await api.get("/api/dashboard");
    return response.data;
  } catch (error) {
    console.error("Error fetching student dashboard:", error);
    throw error;
  }
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (notificationId) => {
  try {
    const response = await api.patch(
      `/api/student/notifications/${notificationId}/read`
    );
    return response.data;
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
};

/**
 * Get student results
 */
export const getStudentResults = async () => {
  try {
    const response = await api.get("/api/student/results");
    return response.data;
  } catch (error) {
    console.error("Error fetching student results:", error);
    throw error;
  }
};

/**
 * Get detailed result
 */
export const getResultDetail = async (resultId) => {
  try {
    const response = await api.get(`/api/student/results/${resultId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching result detail:", error);
    throw error;
  }
};

/**
 * Send team chat message
 */
export const sendTeamChatMessage = async (teamId, data) => {
  try {
    const response = await api.post(`/api/student/team/${teamId}/chat`, data);
    return response.data;
  } catch (error) {
    console.error("Error sending team chat message:", error);
    throw error;
  }
};

/**
 * Get team chat messages
 */
export const getTeamChatMessages = async (teamId, filters = {}) => {
  try {
    const queryParams = new URLSearchParams();

    if (filters.page) queryParams.append("page", filters.page);
    if (filters.limit) queryParams.append("limit", filters.limit);
    if (filters.before) queryParams.append("before", filters.before);

    const response = await api.get(
      `/api/student/team/${teamId}/chat?${queryParams.toString()}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching team chat messages:", error);
    throw error;
  }
};

/**
 * Mark team chat as read
 */
export const markTeamChatAsRead = async (teamId) => {
  try {
    const response = await api.post(`/api/student/team/${teamId}/chat/read`);
    return response.data;
  } catch (error) {
    console.error("Error marking team chat as read:", error);
    throw error;
  }
};

/**
 * Get available supervisors for preferences
 */
export const getAvailableSupervisors = async () => {
  try {
    const response = await api.get("/api/supervisors/available");
    return response.data;
  } catch (error) {
    console.error("Error fetching available supervisors:", error);
    throw error;
  }
};

/**
 * Get student's supervisor preferences
 */
export const getStudentSupervisorPreferences = async () => {
  try {
    const response = await api.get("/api/student/supervisor-preferences");
    return response.data;
  } catch (error) {
    console.error("Error fetching supervisor preferences:", error);
    throw error;
  }
};

/**
 * Submit supervisor preferences
 */
export const submitSupervisorPreferences = async (data) => {
  try {
    const response = await api.post(
      "/api/student/supervisor-preferences",
      data
    );
    return response.data;
  } catch (error) {
    console.error("Error submitting supervisor preferences:", error);
    throw error;
  }
};

/**
 * Get student deadlines
 */
export const getStudentDeadlines = async () => {
  try {
    const response = await api.get("/api/student/deadlines");
    return response.data;
  } catch (error) {
    console.error("Error fetching student deadlines:", error);
    throw error;
  }
};

/**
 * Submit a report
 */
export const submitReport = async (data) => {
  try {
    const response = await api.post("/api/student/submit-report", data);
    return response.data;
  } catch (error) {
    console.error("Error submitting report:", error);
    throw error;
  }
};

/**
 * Get student messages
 */
export const getStudentMessages = async () => {
  try {
    const response = await api.get("/api/student/messages");
    return response.data;
  } catch (error) {
    console.error("Error fetching student messages:", error);
    throw error;
  }
};

/**
 * Mark message as read
 */
export const markMessageAsRead = async (messageId) => {
  try {
    const response = await api.put(`/api/student/messages/${messageId}/read`);
    return response.data;
  } catch (error) {
    console.error("Error marking message as read:", error);
    throw error;
  }
};

// Export as studentAPI object for consistency with other API modules
export const studentAPI = {
  getStudentProfile,
  updateStudentProfile,
  getUserTeam,
  createTeam,
  inviteToTeam,
  getPendingInvitations,
  respondToInvitation,
  removeMember,
  leaveTeam,
  getAvailableStudents,
  createProject,
  submitProject,
  getProjectSubmissions,
  markNotificationAsRead,
  getStudentResults,
  getResultDetail,
  sendTeamChatMessage,
  getTeamChatMessages,
  markTeamChatAsRead,
  getAvailableSupervisors,
  getStudentSupervisorPreferences,
  submitSupervisorPreferences,
  getStudentDeadlines,
  submitReport,
  getStudentMessages,
  markMessageAsRead,
  getStudentDashboard,
};

export default studentAPI;