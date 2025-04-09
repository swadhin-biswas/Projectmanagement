import dashboardAPI from "../api/dashboard";
import { api } from "../lib/api";

/**
 * Prefetch service to improve loading times
 *
 * This service prefetches commonly used data in the background
 * to make the UI feel more responsive.
 */
class PrefetchService {
  constructor() {
    this.prefetchInProgress = false;
    this.prefetchedData = {};
  }

  /**
   * Start prefetching data based on user role
   * @param {string} role - User role (admin, supervisor, student)
   */
  initPrefetch(role) {
    if (this.prefetchInProgress) return;

    this.prefetchInProgress = true;

    // Wait for a short delay to let critical resources load first
    setTimeout(() => {
      this.prefetchBasedOnRole(role);
    }, 2000);
  }

  /**
   * Prefetch data specific to user role
   * @param {string} role - User role
   */
  async prefetchBasedOnRole(role) {
    try {
      // Prefetch common data for all users
      const commonPromises = [
        this.prefetchResource("/api/notifications/unread/count"),
        this.prefetchResource("/api/auth/profile"),
      ];

      // Role-specific prefetching
      let rolePromises = [];

      if (role === "student") {
        rolePromises = [this.prefetchDashboard("student")];
      } else if (role === "supervisor") {
        rolePromises = [this.prefetchDashboard("supervisor")];
      } else if (role === "admin") {
        rolePromises = [this.prefetchDashboard("admin")];
      }

      // Execute prefetching in background
      await Promise.allSettled([...commonPromises, ...rolePromises]);
    } catch (error) {
      console.log("Prefetching failed silently:", error);
    } finally {
      this.prefetchInProgress = false;
    }
  }

  /**
   * Prefetch a specific dashboard
   * @param {string} type - Dashboard type (student, supervisor, admin)
   */
  async prefetchDashboard(type) {
    try {
      switch (type) {
        case "student":
          this.prefetchedData.studentDashboard =
            await dashboardAPI.getStudentDashboard();
          break;
        case "supervisor":
          this.prefetchedData.supervisorDashboard =
            await dashboardAPI.getSupervisorDashboard();
          break;
        case "admin":
          this.prefetchedData.adminDashboard =
            await dashboardAPI.getAdminDashboard();
          break;
      }
    } catch (error) {
      console.log(`Failed to prefetch ${type} dashboard:`, error);
    }
  }

  /**
   * Prefetch a resource and store it in the cache
   * @param {string} url - API URL to prefetch
   */
  async prefetchResource(url) {
    try {
      await api.get(url, {
        silent: true, // Don't show errors for this request
        headers: { "X-Prefetch": "true" },
      });
    } catch (error) {
      // Silently fail for prefetch requests
      console.log(`Failed to prefetch ${url}:`, error);
    }
  }

  /**
   * Get prefetched data if available
   * @param {string} key - Data key to retrieve
   * @returns {object|null} Prefetched data or null
   */
  getPrefetchedData(key) {
    return this.prefetchedData[key] || null;
  }

  /**
   * Clear all prefetched data
   */
  clearPrefetchedData() {
    this.prefetchedData = {};
  }
}

// Create and export a singleton instance
const prefetchService = new PrefetchService();
export default prefetchService;
