import { api, getAuthToken, setAuthToken } from "./api";

/**
 * API client utility to simplify making authenticated requests
 * This ensures proper authorization headers are set for every request
 */
class ApiClient {
  /**
   * Make a GET request with proper authorization
   *
   * @param {string} url - API endpoint to call
   * @param {object} options - Request options
   * @returns {Promise} - API response
   */
  get(url, options = {}) {
    return this.request("get", url, null, options);
  }

  /**
   * Make a POST request with proper authorization
   *
   * @param {string} url - API endpoint to call
   * @param {object} data - Request payload
   * @param {object} options - Request options
   * @returns {Promise} - API response
   */
  post(url, data = {}, options = {}) {
    return this.request("post", url, data, options);
  }

  /**
   * Make a PUT request with proper authorization
   *
   * @param {string} url - API endpoint to call
   * @param {object} data - Request payload
   * @param {object} options - Request options
   * @returns {Promise} - API response
   */
  put(url, data = {}, options = {}) {
    return this.request("put", url, data, options);
  }

  /**
   * Make a DELETE request with proper authorization
   *
   * @param {string} url - API endpoint to call
   * @param {object} options - Request options
   * @returns {Promise} - API response
   */
  delete(url, options = {}) {
    return this.request("delete", url, null, options);
  }

  /**
   * Normalize API URLs to ensure proper formatting
   *
   * @param {string} url - URL to normalize
   * @returns {string} - Normalized URL
   */
  normalizeUrl(url) {
    // If URL already has /api/ or /student/ prefix, use it as is
    if (url.includes("/api/") || url.startsWith("/student/")) {
      return url;
    }

    // For team endpoints under /students/team path, use student prefix
    if (url.includes("/students/team")) {
      return `/student${url.startsWith("/") ? url : `/${url}`}`;
    }

    // Default: add /api prefix to URL
    return `/api${url.startsWith("/") ? url : `/${url}`}`;
  }

  /**
   * Make a request with authentication
   *
   * @param {string} method - HTTP method
   * @param {string} url - API endpoint
   * @param {object} data - Request payload
   * @param {object} options - Additional request options
   * @returns {Promise} - API response
   */
  async request(method, url, data = null, options = {}) {
    // Normalize URL format
    const apiUrl = this.normalizeUrl(url);

    // Get auth token
    const token = getAuthToken();

    // Configure request options
    const requestOptions = {
      ...options,
      headers: {
        ...options.headers,
        "Content-Type": "application/json",
      },
    };

    // Add Authorization header if token exists
    if (token) {
      requestOptions.headers.Authorization = `Bearer ${token}`;
    }

    // Determine if authentication is required
    const requiresAuth = options.requiresAuth !== false; // Default to true
    const isAuthEndpoint =
      url.includes("/auth/login") || url.includes("/auth/register");

    // Skip request if token is required but not available (for non-auth endpoints)
    if (requiresAuth && !token && !isAuthEndpoint) {
      // For specific endpoints, we'll still make the request without auth
      const allowedUnauthenticatedEndpoints = [
        "/students/team",
        "/student/students/team",
        "/notifications",
        "/dashboard",
        "/profile",
      ];

      const isExemptEndpoint = allowedUnauthenticatedEndpoints.some(
        (endpoint) => url.includes(endpoint) || apiUrl.includes(endpoint)
      );

      if (!isExemptEndpoint) {
        console.warn(`Authentication required for endpoint: ${apiUrl}`);
        return {
          data: {
            success: false,
            error: "Authentication required. Please login.",
            code: "INTERNAL_ERROR",
          },
        };
      }
    }

    // Make the API request with the configured options
    try {
      if (method === "get" || method === "delete") {
        return await api[method](apiUrl, requestOptions);
      } else {
        return await api[method](apiUrl, data, requestOptions);
      }
    } catch (error) {
      // Special handling for 401 Unauthorized errors
      if (error.response?.status === 401 && !isAuthEndpoint) {
        console.error(
          `Authorization error for ${apiUrl}:`,
          error.response?.data
        );

        if (
          error.response?.data?.error?.includes("expired") ||
          error.response?.data?.error?.includes("invalid token")
        ) {
          console.warn(
            "Token expired or invalid, clearing authentication data"
          );
          setAuthToken(null);

          // Enhance the error object to make it clear what happened
          error.authError = true;
          error.authErrorType = "token_expired";
        }
      }

      // Log failed requests in development
      if (process.env.NODE_ENV !== "production") {
        console.error(`API ${method.toUpperCase()} ${apiUrl} failed:`, error);
      }

      throw error;
    }
  }
}

// Create a singleton instance for use throughout the app
const apiClient = new ApiClient();
export default apiClient;
