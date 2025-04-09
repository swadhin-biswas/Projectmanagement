import ErrorBoundary from "@/components/ErrorBoundary";
import { QueryProvider } from "@/components/QueryProvider";
import { ToastProvider } from "@/components/ToastProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
import Routes from "@/routes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider as NextThemesProvider } from "next-themes";
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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <BrowserRouter>
          <HelmetProvider>
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
          </HelmetProvider>
        </BrowserRouter>
      </ErrorBoundary>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}
