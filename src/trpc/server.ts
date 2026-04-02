import "server-only";
import { createTRPCContext, createCallerFactory } from "./init";
import { appRouter } from "./router";
import { cache } from "react";

const createCaller = createCallerFactory(appRouter);

export const api = cache(async () => {
  const ctx = await createTRPCContext();
  return createCaller(ctx);
});
