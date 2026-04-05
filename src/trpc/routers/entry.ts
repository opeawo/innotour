import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { resolveUser } from "@/lib/helpers/auth";
import { createEntrySchema, updateEntrySchema } from "@/lib/validators/entry";
import {
  createEntry,
  submitEntry,
  updateEntry,
  withdrawEntry,
  getEntry,
  listEntries,
  listMyEntries,
} from "@/lib/services/entry.service";

export const entryRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createEntrySchema)
    .mutation(async ({ ctx, input }) => {
      const user = await resolveUser(ctx.userId);
      return createEntry(user.tenantId!, input.tournamentId, user.id, {
        title: input.title,
        description: input.description,
        submissionUrl: input.submissionUrl,
      });
    }),

  submit: protectedProcedure
    .input(z.object({ entryId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const user = await resolveUser(ctx.userId);
      return submitEntry(input.entryId, user.id);
    }),

  update: protectedProcedure
    .input(updateEntrySchema)
    .mutation(async ({ ctx, input }) => {
      const user = await resolveUser(ctx.userId);
      const { entryId, ...data } = input;
      return updateEntry(entryId, user.id, data);
    }),

  withdraw: protectedProcedure
    .input(z.object({ entryId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const user = await resolveUser(ctx.userId);
      return withdrawEntry(input.entryId, user.id);
    }),

  get: protectedProcedure
    .input(z.object({ entryId: z.string().uuid() }))
    .query(async ({ input }) => {
      return getEntry(input.entryId);
    }),

  list: protectedProcedure
    .input(
      z.object({
        tournamentId: z.string().uuid(),
        status: z.string().optional(),
        page: z.number().int().positive().optional(),
        limit: z.number().int().positive().max(100).optional(),
      })
    )
    .query(async ({ input }) => {
      return listEntries(input.tournamentId, {
        status: input.status,
        page: input.page,
        limit: input.limit,
      });
    }),

  myEntries: protectedProcedure.query(async ({ ctx }) => {
    const user = await resolveUser(ctx.userId);
    return listMyEntries(user.id);
  }),
});
