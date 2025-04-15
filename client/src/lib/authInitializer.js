import { api, getAuthToken, setAuthToken } from "./api";

/**
 * Initialize authentication state on application startup
 * This ensures the token is properly loaded and API headers are set
 */
export const initializeAuth = () => {
  // Try to get the auth token from all possible locations
  const token = getAuthToken();

  if (token) {
    // Ensure token is properly set in API headers
    setAuthToken(token);

    // Verify the token was properly set
    if (
      !api.defaults.headers.common["Authorization"] ||
      api.defaults.headers.common["Authorization"] !== `Bearer ${token}`
    ) {
      console.warn(
        "Auth headers were not set properly during initialization, forcing sync"
      );
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }

    // Ensure the token is synced across all potential API instances
    try {
      // This ensures that any module-level API instances are also updated
      if (window.syncAllAPIInstances) {
        window.syncAllAPIInstances(token);
      }
    } catch (e) {
      console.error("Error during API instance sync", e);
    }

    console.log("Auth token initialized from storage");
    return true;
  } else {
    console.log("No auth token found during initialization");
    // Ensure headers are cleared if no token is found
    if (api.defaults.headers.common["Authorization"]) {
      delete api.defaults.headers.common["Authorization"];
    }
  }

  return false;
};

export default initializeAuth;
