import api from "./api";

/**
 * Get all projects assigned to the supervisor
 */
export const getAssignedProjects = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams();

    // Add pagination
    if (filters.page) queryParams.append("page", filters.page);
    if (filters.limit) queryParams.append("limit", filters.limit);

    // Add filters
    if (filters.status) queryParams.append("status", filters.status);
    if (filters.type) queryParams.append("type", filters.type);
    if (filters.search) queryParams.append("search", filters.search);
    if (filters.sessionId) queryParams.append("sessionId", filters.sessionId);
    if (filters.sort) queryParams.append("sort", JSON.stringify(filters.sort));

    const response = await api.get(
      `/api/supervisor/projects?${queryParams.toString()}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching assigned projects:", error);
    throw error;
  }
};

/**
 * Get project details
 */
export const getProjectDetails = async (projectId) => {
  try {
    const response = await api.get(`/api/supervisor/projects/${projectId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching project details:", error);
    throw error;
  }
};

/**
 * Get project submissions
 */
export const getProjectSubmissions = async (projectId) => {
  try {
    const response = await api.get(
      `/api/supervisor/projects/${projectId}/submissions`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching project submissions:", error);
    throw error;
  }
};

/**
 * Review project submission
 */
export const reviewProjectSubmission = async (
  projectId,
  submissionId,
  data
) => {
  try {
    const response = await api.post(
      `/api/supervisor/projects/${projectId}/submissions/${submissionId}/review`,
      data
    );
    return response.data;
  } catch (error) {
    console.error("Error reviewing project submission:", error);
    throw error;
  }
};

/**
 * Update project status
 */
export const updateProjectStatus = async (projectId, data) => {
  try {
    const response = await api.patch(
      `/api/supervisor/projects/${projectId}/status`,
      data
    );
    return response.data;
  } catch (error) {
    console.error("Error updating project status:", error);
    throw error;
  }
};

/**
 * Get assigned students
 */
export const getAssignedStudents = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams();

    if (filters.page) queryParams.append("page", filters.page);
    if (filters.limit) queryParams.append("limit", filters.limit);
    if (filters.search) queryParams.append("search", filters.search);
    if (filters.sessionId) queryParams.append("sessionId", filters.sessionId);
    if (filters.status) queryParams.append("status", filters.status);

    const response = await api.get(
      `/api/supervisor/students?${queryParams.toString()}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching assigned students:", error);
    throw error;
  }
};

/**
 * Get assigned teams
 */
export const getAssignedTeams = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams();

    if (filters.page) queryParams.append("page", filters.page);
    if (filters.limit) queryParams.append("limit", filters.limit);
    if (filters.search) queryParams.append("search", filters.search);
    if (filters.sessionId) queryParams.append("sessionId", filters.sessionId);
    if (filters.status) queryParams.append("status", filters.status);

    const response = await api.get(
      `/api/supervisor/teams?${queryParams.toString()}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching assigned teams:", error);
    throw error;
  }
};

/**
 * Get team details
 */
export const getTeamDetails = async (teamId) => {
  try {
    const response = await api.get(`/api/supervisor/teams/${teamId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching team details:", error);
    throw error;
  }
};

/**
 * Record feedback for a student
 */
export const recordFeedback = async (data) => {
  try {
    const response = await api.post("/api/supervisor/feedback", data);
    return response.data;
  } catch (error) {
    console.error("Error recording feedback:", error);
    throw error;
  }
};

/**
 * Schedule a meeting with team members
 */
export const scheduleMeeting = async (data) => {
  try {
    const response = await api.post("/api/supervisor/meetings", data);
    return response.data;
  } catch (error) {
    console.error("Error scheduling meeting:", error);
    throw error;
  }
};

/**
 * Get supervisor's meetings
 */
export const getSupervisorMeetings = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams();

    if (filters.page) queryParams.append("page", filters.page);
    if (filters.limit) queryParams.append("limit", filters.limit);
    if (filters.status) queryParams.append("status", filters.status);
    if (filters.from) queryParams.append("from", filters.from);
    if (filters.to) queryParams.append("to", filters.to);
    if (filters.teamId) queryParams.append("team", filters.teamId);

    const response = await api.get(
      `/api/supervisor/meetings?${queryParams.toString()}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching supervisor meetings:", error);
    throw error;
  }
};

/**
 * Get supervisor analytics
 */
export const getSupervisorAnalytics = async () => {
  try {
    const response = await api.get("/api/supervisor/analytics");
    return response.data;
  } catch (error) {
    console.error("Error fetching supervisor analytics:", error);
    throw error;
  }
};

/**
 * Get supervisor profile
 */
export const getSupervisorProfile = async () => {
  try {
    const response = await api.get("/api/supervisor/profile");
    return response.data;
  } catch (error) {
    console.error("Error fetching supervisor profile:", error);
    throw error;
  }
};

/**
 * Update supervisor profile
 */
export const updateSupervisorProfile = async (data) => {
  try {
    const response = await api.put("/api/supervisor/profile", data);
    return response.data;
  } catch (error) {
    console.error("Error updating supervisor profile:", error);
    throw error;
  }
};

/**
 * Update team progress
 */
export const updateTeamProgress = async (teamId, data) => {
  try {
    const response = await api.put(
      `/api/supervisor/teams/${teamId}/progress`,
      data
    );
    return response.data;
  } catch (error) {
    console.error("Error updating team progress:", error);
    throw error;
  }
};

/**
 * Send email to students
 */
export const sendEmail = async (data) => {
  try {
    const response = await api.post("/api/supervisor/email", data);
    return response.data;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

/**
 * Create notification for students
 */
export const createNotification = async (data) => {
  try {
    const response = await api.post("/api/supervisor/notifications", data);
    return response.data;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
};

/**
 * Upload document
 */
export const uploadDocument = async (data) => {
  try {
    const response = await api.post("/api/supervisor/documents", data);
    return response.data;
  } catch (error) {
    console.error("Error uploading document:", error);
    throw error;
  }
};
