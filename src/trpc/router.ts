import { createTRPCRouter } from "./init";
import { healthRouter } from "./routers/health";
import { tournamentRouter } from "./routers/tournament";
import { entryRouter } from "./routers/entry";
import { reviewRouter } from "./routers/review";
import { stageRouter } from "./routers/stage";
import { nominationRouter } from "./routers/nomination";
import { adminRouter } from "./routers/admin";

export const appRouter = createTRPCRouter({
  health: healthRouter,
  tournament: tournamentRouter,
  entry: entryRouter,
  review: reviewRouter,
  stage: stageRouter,
  nomination: nominationRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
