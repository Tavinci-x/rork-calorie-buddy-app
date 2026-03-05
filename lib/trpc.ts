import { httpLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";

import type { AppRouter } from "@/backend/trpc/app-router";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  const url = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  if (url) {
    console.log('[trpc] Using RORK_API_BASE_URL:', url);
    return url;
  }

  const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
  if (projectId) {
    const fallback = `https://dev-${projectId}.rorktest.dev`;
    console.log('[trpc] Using fallback URL:', fallback);
    return fallback;
  }

  console.warn('[trpc] No backend URL configured, using hardcoded fallback');
  return "https://dev-8f96p27xi3u53u85bgjf7.rorktest.dev";
};

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
      fetch: async (url, options) => {
        try {
          return await fetch(url, options);
        } catch (e) {
          console.log('[trpc] fetch failed (backend may not be deployed):', e);
          return new Response(JSON.stringify({ error: 'Backend not available' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      },
    }),
  ],
});
