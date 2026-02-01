import { QueryClient, defaultShouldDehydrateQuery } from "@tanstack/react-query";
import { cache } from "react";

/**
 * Server-side QueryClient singleton per request
 * Uses React's cache() to deduplicate within a single server request
 */
export const getQueryClient = cache(
  () =>
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000, // 1 min - prevents immediate refetch after hydration
        },
        dehydrate: {
          // Include pending queries in dehydrated state for streaming
          shouldDehydrateQuery: (query) =>
            defaultShouldDehydrateQuery(query) ||
            query.state.status === "pending",
        },
      },
    })
);
