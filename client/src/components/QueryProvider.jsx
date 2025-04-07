import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

export function QueryProvider({ children }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // Data is fresh for 5 minutes
        cacheTime: 1000 * 60 * 30, // Cache persists for 30 minutes
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
        retry: (failureCount, error) => {
          // Don't retry on 401/403/404
          if (error?.response?.status === 401) return false;
          if (error?.response?.status === 403) return false;
          if (error?.response?.status === 404) return false;
          return failureCount < 2;
        },
        onError: (error) => {
          // Show error toast for failed queries
          const message = error?.response?.data?.error || error.message;
          toast.error('Query Error', {
            description: message || 'An error occurred while fetching data'
          });
        }
      },
      mutations: {
        onError: (error, variables, context, mutation) => {
          // Show error toast for failed mutations
          const message = error?.response?.data?.error || error.message;
          toast.error('Action Failed', {
            description: message || 'Failed to perform the requested action'
          });

          // If we have rollback data in the context, restore it
          if (context?.previousData) {
            queryClient.setQueryData(mutation.meta?.queryKey, context.previousData);
          }
        }
      }
    }
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}