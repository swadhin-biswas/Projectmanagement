// API functions for dashboard data
import apiClient from "../lib/apiClient";

export default {
  // Get student dashboard data
  getStudentDashboard: async () => {
    try {
      const response = await apiClient.get("/dashboard", {
        timeout: 5000,
        requiresAuth: true,
        silent: true,
      });

      // Ensure response matches the expected schema
      if (response.data && response.data.success) {
        const data = response.data.data || {};
        return {
          success: true,
          data: {
            currentSession: data.currentSession || {
              id: "",
              name: "",
              startDate: "",
              endDate: "",
            },
            team: data.team || null,
            upcomingDeadlines: data.upcomingDeadlines || [],
            recentActivities: data.recentActivities || [],
            notifications: data.notifications || [],
            projectStatus: data.projectStatus || {
              status: "not_started",
              progress: 0,
              lastUpdated: "",
            },
          },
        };
      }

      return response.data;
    } catch (error) {
      console.error("Student dashboard fetch error:", error);
      // Return a default empty dashboard structure rather than throwing
      return {
        success: false,
        error: "Dashboard not available",
        data: {
          currentSession: {
            id: "",
            name: "",
            startDate: "",
            endDate: "",
          },
          team: null,
          upcomingDeadlines: [],
          recentActivities: [],
          notifications: [],
          projectStatus: {
            status: "not_started",
            progress: 0,
            lastUpdated: "",
          },
        },
      };
    }
  },

  // Get supervisor dashboard data
  getSupervisorDashboard: async () => {
    try {
      const response = await apiClient.get("/dashboard/supervisor", {
        timeout: 5000,
        requiresAuth: true,
        silent: true,
      });

      // Ensure response matches the expected schema
      if (response.data && response.data.success) {
        const data = response.data.data || {};
        return {
          success: true,
          data: {
            currentSession: data.currentSession || {
              id: "",
              name: "",
              startDate: "",
              endDate: "",
            },
            teams: data.teams || [],
            students: data.students || [],
            upcoming: data.upcoming || [],
            upcomingDeadlines: data.upcomingDeadlines || [],
            recentActivities: data.recentActivities || [],
            notifications: data.notifications || [],
            statistics: data.statistics || {
              activeTeams: 0,
              pendingReviews: 0,
              upcomingMeetings: 0,
            },
          },
        };
      }

      return response.data;
    } catch (error) {
      console.error("Supervisor dashboard fetch error:", error);
      // Return a default empty dashboard structure rather than throwing
      return {
        success: false,
        error: "Supervisor dashboard not available",
        data: {
          currentSession: {
            id: "",
            name: "",
            startDate: "",
            endDate: "",
          },
          teams: [],
          students: [],
          upcoming: [],
          upcomingDeadlines: [],
          recentActivities: [],
          notifications: [],
          statistics: {
            activeTeams: 0,
            pendingReviews: 0,
            upcomingMeetings: 0,
          },
        },
      };
    }
  },

  // Get admin dashboard data
  getAdminDashboard: async () => {
    try {
      const response = await apiClient.get("/dashboard/admin", {
        timeout: 5000,
        requiresAuth: true,
        silent: true,
      });

      // Ensure response matches the expected schema
      if (response.data && response.data.success) {
        const data = response.data.data || {};
        return {
          success: true,
          data: {
            currentSession: data.currentSession || {
              id: "",
              name: "",
              startDate: "",
              endDate: "",
            },
            users: data.users || [],
            sessions: data.sessions || [],
            teams: data.teams || [],
            upcomingDeadlines: data.upcomingDeadlines || [],
            recentActivities: data.recentActivities || [],
            notifications: data.notifications || [],
            statistics: data.statistics || {
              totalUsers: 0,
              activeSessions: 0,
              totalTeams: 0,
            },
          },
        };
      }

      return response.data;
    } catch (error) {
      console.error("Admin dashboard fetch error:", error);
      // Return a default empty dashboard structure rather than throwing
      return {
        success: false,
        error: "Admin dashboard not available",
        data: {
          currentSession: {
            id: "",
            name: "",
            startDate: "",
            endDate: "",
          },
          users: [],
          sessions: [],
          teams: [],
          upcomingDeadlines: [],
          recentActivities: [],
          notifications: [],
          statistics: {
            totalUsers: 0,
            activeSessions: 0,
            totalTeams: 0,
          },
        },
      };
    }
  },

  // Get system overview (Admin/Supervisor)
  getSystemOverview: async () => {
    try {
      const response = await apiClient.get("/analytics/overview", {
        requiresAuth: true,
        silent: true,
      });
      return response.data;
    } catch (error) {
      console.error("System overview fetch error:", error);
      return {
        success: false,
        error: "System overview not available",
        data: { users: 0, projects: 0, teams: 0, activities: 0 },
      };
    }
  },

  // Get team statistics (Admin/Supervisor)
  getTeamStatistics: async () => {
    try {
      const response = await apiClient.get("/analytics/teams", {
        requiresAuth: true,
        silent: true,
      });
      return response.data;
    } catch (error) {
      console.error("Team statistics fetch error:", error);
      return {
        success: false,
        error: "Team statistics not available",
        data: { teams: [] },
      };
    }
  },

  // Get submission statistics (Admin/Supervisor)
  getSubmissionStatistics: async () => {
    try {
      const response = await apiClient.get("/analytics/submissions", {
        requiresAuth: true,
        silent: true,
      });
      return response.data;
    } catch (error) {
      console.error("Submission statistics fetch error:", error);
      return {
        success: false,
        error: "Submission statistics not available",
        data: { submissions: [] },
      };
    }
  },

  // Get coordinator dashboard data
  getCoordinatorDashboard: async () => {
    try {
      const response = await apiClient.get("/dashboard/coordinator", {
        timeout: 5000,
        requiresAuth: true,
        silent: true,
      });

      // Ensure response matches the expected schema
      if (response.data && response.data.success) {
        const data = response.data.data || {};
        return {
          success: true,
          data: {
            currentSession: data.currentSession || {
              id: "",
              name: "",
              startDate: "",
              endDate: "",
            },
            departments: data.departments || [],
            supervisors: data.supervisors || [],
            teams: data.teams || [],
            upcomingDeadlines: data.upcomingDeadlines || [],
            recentActivities: data.recentActivities || [],
            notifications: data.notifications || [],
            statistics: data.statistics || {
              totalTeams: 0,
              totalStudents: 0,
              totalSupervisors: 0,
              assignedSupervisors: 0,
              unassignedTeams: 0,
            },
          },
        };
      }

      return response.data;
    } catch (error) {
      console.error("Coordinator dashboard fetch error:", error);
      // Return a default empty dashboard structure rather than throwing
      return {
        success: false,
        error: "Coordinator dashboard not available",
        data: {
          currentSession: {
            id: "",
            name: "",
            startDate: "",
            endDate: "",
          },
          departments: [],
          supervisors: [],
          teams: [],
          upcomingDeadlines: [],
          recentActivities: [],
          notifications: [],
          statistics: {
            totalTeams: 0,
            totalStudents: 0,
            totalSupervisors: 0,
            assignedSupervisors: 0,
            unassignedTeams: 0,
          },
        },
      };
    }
  },

  // Get performance metrics (Admin/Supervisor)
  getPerformanceMetrics: async () => {
    try {
      const response = await apiClient.get("/analytics/performance", {
        requiresAuth: true,
        silent: true,
      });
      return response.data;
    } catch (error) {
      console.error("Performance metrics fetch error:", error);
      return {
        success: false,
        error: "Performance metrics not available",
        data: { metrics: [] },
      };
    }
  },
};
