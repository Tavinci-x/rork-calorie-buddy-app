import { httpLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";

import type { AppRouter } from "@/backend/trpc/app-router";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  const url = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  if (url) return url;

  const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
  if (projectId) {
    return `https://rork.app/api/project/${projectId}`;
  }

  return "https://localhost:0";
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
