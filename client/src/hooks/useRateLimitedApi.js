import { useCallback, useState } from "react";
import { toast } from "react-hot-toast";

/**
 * Custom hook for handling rate-limited API calls
 * @param {Function} apiFn - The API function to call
 * @param {Object} options - Options for configuring the behavior
 * @returns {Object} The wrapped API call and loading state
 */
export function useRateLimitedApi(apiFn, options = {}) {
  const {
    onError = (error) => toast.error(error.message || "An error occurred"),
    onRateLimit = () =>
      toast.error("Too many requests. Please try again in a moment."),
    onSuccess,
    showLoader = true,
  } = options;

  const [isLoading, setIsLoading] = useState(false);

  const execute = useCallback(
    async (...args) => {
      try {
        if (showLoader) {
          setIsLoading(true);
        }

        const result = await apiFn(...args);

        if (onSuccess) {
          onSuccess(result);
        }

        return result;
      } catch (error) {
        // Special handling for rate limit errors
        if (error.response?.status === 429) {
          onRateLimit(error);
          return { error, rateLimited: true };
        }

        // Handle other errors
        onError(error);
        return { error };
      } finally {
        if (showLoader) {
          setIsLoading(false);
        }
      }
    },
    [apiFn, onError, onRateLimit, onSuccess, showLoader]
  );

  return { execute, isLoading };
}

export default useRateLimitedApi;
