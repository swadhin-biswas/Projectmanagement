import dashboardAPI from "../api/dashboard";
import { getAuthToken } from "../lib/api";
import apiClient from "../lib/apiClient";

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
    this.failedEndpoints = new Set(); // Track failed endpoints to avoid repeated calls
    this.maxAttempts = 2; // Maximum number of attempts per endpoint
    this.attemptCounts = {}; // Track attempt counts per endpoint
  }

  /**
   * Start prefetching data based on user role
   * @param {string} role - User role (admin, supervisor, student)
   */
  initPrefetch(role) {
    // Reset failed endpoints on each initialization
    this.failedEndpoints.clear();
    this.attemptCounts = {};

    // Don't prefetch if authentication token is missing
    if (!getAuthToken()) {
      console.log("Skipping prefetch - no authentication token");
      return;
    }

    if (this.prefetchInProgress) return;

    this.prefetchInProgress = true;

    // Wait for a short delay to let critical resources load first
    setTimeout(() => {
      this.prefetchBasedOnRole(role);
    }, 2000);
  }

  /**
   * Increment attempt count for an endpoint
   * @param {string} endpoint - API endpoint
   * @returns {boolean} - Whether to allow another attempt
   */
  incrementAttempt(endpoint) {
    if (!this.attemptCounts[endpoint]) {
      this.attemptCounts[endpoint] = 1;
      return true;
    }

    this.attemptCounts[endpoint]++;

    if (this.attemptCounts[endpoint] > this.maxAttempts) {
      this.failedEndpoints.add(endpoint);
      return false;
    }

    return true;
  }

  /**
   * Prefetch data specific to user role
   * @param {string} role - User role
   */
  async prefetchBasedOnRole(role) {
    try {
      // Ensure we have an auth token before proceeding
      if (!getAuthToken()) {
        console.log("Aborting prefetch - lost authentication token");
        this.prefetchInProgress = false;
        return;
      }

      // Prefetch common data for all users - use verified endpoints
      const commonPromises = [];

      // Only try to fetch unread count once to avoid repeated 404s
      const notificationEndpoint = "/notifications/unread/count";
      const profileEndpoint = "/auth/profile";

      if (
        !this.failedEndpoints.has(notificationEndpoint) &&
        this.incrementAttempt(notificationEndpoint)
      ) {
        commonPromises.push(this.prefetchResource(notificationEndpoint));
      }

      if (
        !this.failedEndpoints.has(profileEndpoint) &&
        this.incrementAttempt(profileEndpoint)
      ) {
        commonPromises.push(this.prefetchResource(profileEndpoint));
      }

      // Role-specific prefetching - but skip if we've failed before
      const dashboardKey = `dashboard-${role}`;

      if (
        !this.failedEndpoints.has(dashboardKey) &&
        this.incrementAttempt(dashboardKey)
      ) {
        try {
          const dashboardData = await this.prefetchDashboard(role);
          // If we got data successfully, store it
          if (dashboardData && dashboardData.success !== false) {
            this.prefetchedData[`${role}Dashboard`] = dashboardData;
          }
        } catch (error) {
          console.log(`Dashboard prefetch for ${role} failed:`, error);
          this.failedEndpoints.add(dashboardKey);
        }
      }

      // Execute common prefetching promises in background
      if (commonPromises.length > 0) {
        try {
          await Promise.allSettled(commonPromises);
        } catch (error) {
          console.log("Common prefetch promises failed:", error);
        }
      }
    } catch (error) {
      console.log("Prefetching failed silently:", error);
    } finally {
      this.prefetchInProgress = false;
    }
  }

  /**
   * Prefetch a specific dashboard
   * @param {string} type - Dashboard type (student, supervisor, admin)
   * @returns {Promise<object>} Dashboard data
   */
  async prefetchDashboard(type) {
    try {
      let result;

      switch (type) {
        case "student":
          result = await dashboardAPI.getStudentDashboard();
          break;
        case "supervisor":
          result = await dashboardAPI.getSupervisorDashboard();
          break;
        case "admin":
          result = await dashboardAPI.getAdminDashboard();
          break;
        default:
          throw new Error(`Unknown dashboard type: ${type}`);
      }

      // If we get an error response, mark as failed
      if (result && result.success === false) {
        console.log(`Dashboard ${type} not available:`, result.error);
        this.failedEndpoints.add(`dashboard-${type}`);
      }

      return result;
    } catch (error) {
      console.log(`Failed to prefetch ${type} dashboard:`, error);
      this.failedEndpoints.add(`dashboard-${type}`);
      throw error; // Re-throw to handle in the caller
    }
  }

  /**
   * Prefetch a resource and store it in the cache
   * @param {string} url - API URL to prefetch
   */
  async prefetchResource(url) {
    try {
      const response = await apiClient.get(url, {
        silent: true, // Don't show errors for this request
        headers: { "X-Prefetch": "true" },
        requiresAuth: true, // Skip if not authenticated
        timeout: 5000, // 5 second timeout
      });

      // If we reached this point, the request succeeded
      return response.data;
    } catch (error) {
      // Check for 404 to permanently blacklist this endpoint
      if (error.response?.status === 404) {
        console.log(`Endpoint ${url} not found (404), will not retry`);
        this.failedEndpoints.add(url);
      } else {
        console.log(`Failed to prefetch ${url}:`, error);

        // Only add to failed endpoints if we've tried enough times
        if (!this.incrementAttempt(url)) {
          this.failedEndpoints.add(url);
        }
      }
      throw error;
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
    this.failedEndpoints.clear();
    this.attemptCounts = {};
  }
}

// Create and export a singleton instance
const prefetchService = new PrefetchService();
export default prefetchService;
