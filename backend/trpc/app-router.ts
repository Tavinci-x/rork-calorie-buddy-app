import { createTRPCRouter } from "./create-context";
import { catMascotRouter } from "./routes/cat-mascot";

export const appRouter = createTRPCRouter({
  catMascot: catMascotRouter,
});

export type AppRouter = typeof appRouter;
