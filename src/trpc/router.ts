import { createTRPCRouter } from "./init";
import { healthRouter } from "./routers/health";
import { tournamentRouter } from "./routers/tournament";

export const appRouter = createTRPCRouter({
  health: healthRouter,
  tournament: tournamentRouter,
});

export type AppRouter = typeof appRouter;
