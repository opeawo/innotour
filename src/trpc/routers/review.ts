import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { resolveUser } from "@/lib/helpers/auth";
import { submitReviewSchema } from "@/lib/validators/entry";
import {
  getMyReviewQueue,
  getReviewDetail,
  submitReview,
} from "@/lib/services/review.service";
import { getEntryScore } from "@/lib/services/scoring.service";

export const reviewRouter = createTRPCRouter({
  myQueue: protectedProcedure
    .input(z.object({ tournamentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const user = await resolveUser(ctx.userId);
      return getMyReviewQueue(user.id, input.tournamentId);
    }),

  getDetail: protectedProcedure
    .input(z.object({ reviewId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const user = await resolveUser(ctx.userId);
      return getReviewDetail(input.reviewId, user.id);
    }),

  submit: protectedProcedure
    .input(submitReviewSchema)
    .mutation(async ({ ctx, input }) => {
      const user = await resolveUser(ctx.userId);
      return submitReview(input.reviewId, user.id, input.criteriaScores);
    }),

  entryScore: protectedProcedure
    .input(
      z.object({
        entryId: z.string().uuid(),
        stageId: z.string().uuid(),
      })
    )
    .query(async ({ input }) => {
      return getEntryScore(input.entryId, input.stageId);
    }),
});
