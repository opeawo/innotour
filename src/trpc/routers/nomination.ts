import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { resolveUser } from "@/lib/helpers/auth";
import { nominateSchema } from "@/lib/validators/entry";
import {
  nominate,
  listNominations,
  getUserCards,
} from "@/lib/services/nomination.service";

export const nominationRouter = createTRPCRouter({
  nominate: protectedProcedure
    .input(nominateSchema)
    .mutation(async ({ ctx, input }) => {
      const user = await resolveUser(ctx.userId);
      return nominate(
        user.tenantId!,
        input.tournamentId,
        user.id,
        input.nominees
      );
    }),

  myNominations: protectedProcedure
    .input(z.object({ tournamentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const user = await resolveUser(ctx.userId);
      return listNominations(input.tournamentId, user.id);
    }),

  myCards: protectedProcedure
    .input(z.object({ tournamentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const user = await resolveUser(ctx.userId);
      return getUserCards(input.tournamentId, user.id);
    }),
});
