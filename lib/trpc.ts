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

  console.warn("No backend URL configured: EXPO_PUBLIC_RORK_API_BASE_URL and EXPO_PUBLIC_PROJECT_ID are both missing");
  return "";
};

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
    }),
  ],
});
