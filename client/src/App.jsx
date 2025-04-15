import ErrorBoundary from "@/components/ErrorBoundary";
import { QueryProvider } from "@/components/QueryProvider";
import { ToastProvider } from "@/components/ToastProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
import { api, getAuthToken, setAuthToken } from "@/lib/api";
import { initializeAuth } from "@/lib/authInitializer";
import Routes from "@/routes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios from "axios";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useEffect } from "react";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "react-hot-toast";
import { BrowserRouter } from "react-router-dom";

// Configure React Query with better error and retry handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      cacheTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry up to 3 times on other errors
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
      onError: (error) => {
        // Global error handling for queries (already handled by axios interceptor)
      },
    },
    mutations: {
      onError: (error) => {
        // Global error handling for mutations (already handled by axios interceptor)
      },
    },
  },
});

// Initialize authentication on app startup
initializeAuth();

// Add global function to sync auth headers across API instances
window.syncAllAPIInstances = (token) => {
  if (token) {
    // This ensures that imported API instances are updated
    console.log("Synchronizing auth token across all API instances");

    // Add Bearer prefix if not already present
    const authHeader = token.startsWith("Bearer ") ? token : `Bearer ${token}`;

    // Update axios defaults (affects new instances)
    axios.defaults.headers.common["Authorization"] = authHeader;
  } else {
    delete axios.defaults.headers.common["Authorization"];
  }
};

function AppContent() {
  // Reinitialize auth on component mount in case token was added after initial load
  useEffect(() => {
    // Force a token sync to ensure auth headers are set properly
    const token = getAuthToken();
    if (token) {
      setAuthToken(token);
      // Verify the token was properly set in the API headers
      if (
        !api.defaults.headers.common["Authorization"] ||
        api.defaults.headers.common["Authorization"] !== `Bearer ${token}`
      ) {
        console.warn("Auth headers were not set properly, forcing sync");
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      }
    }
  }, []);

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem={true}
      storageKey="project-management-theme"
    >
      <ThemeProvider>
        <ToastProvider />
        <QueryProvider>
          <AuthProvider>
            <WebSocketProvider>
              <NotificationProvider>
                <Routes />
              </NotificationProvider>
            </WebSocketProvider>
          </AuthProvider>
        </QueryProvider>
      </ThemeProvider>
    </NextThemesProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <BrowserRouter>
          <HelmetProvider>
            <AppContent />
          </HelmetProvider>
        </BrowserRouter>
      </ErrorBoundary>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}
