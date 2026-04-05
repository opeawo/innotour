import { z } from "zod";
import { eq, and, asc } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "../init";
import { resolveUser, verifyTournamentOwnership } from "@/lib/helpers/auth";
import { db } from "@/db";
import { stages, tournaments, scores, entries } from "@/db/schema";
import {
  assignReviewers,
  assignExpertReviewers,
} from "@/lib/services/review-assignment.service";
import {
  advanceStage,
  resolveManualTie,
  declareWinner,
} from "@/lib/services/stage-advancement.service";
import { logAudit } from "@/lib/services/audit.service";

export const stageRouter = createTRPCRouter({
  // Start reviewing for a stage (organiser only)
  startReviewing: protectedProcedure
    .input(
      z.object({
        tournamentId: z.string().uuid(),
        stageId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await resolveUser(ctx.userId);
      const tournament = await verifyTournamentOwnership(
        input.tournamentId,
        user.id
      );

      const stage = await db.query.stages.findFirst({
        where: and(
          eq(stages.id, input.stageId),
          eq(stages.tournamentId, input.tournamentId)
        ),
      });
      if (!stage || stage.status !== "pending") {
        throw new (await import("@trpc/server")).TRPCError({
          code: "BAD_REQUEST",
          message: "Stage is not in pending status.",
        });
      }

      // Assign peer reviewers
      const assignments = await assignReviewers(
        input.tournamentId,
        input.stageId
      );

      // If this is the final stage and judges are enabled, assign expert reviewers
      if (stage.type === "final" && tournament.enableJudgePanel) {
        await assignExpertReviewers(input.tournamentId, input.stageId);
      }

      // Update stage status
      await db
        .update(stages)
        .set({ status: "reviewing" })
        .where(eq(stages.id, input.stageId));

      // Update tournament status
      await db
        .update(tournaments)
        .set({ status: "reviewing" })
        .where(eq(tournaments.id, input.tournamentId));

      await logAudit({
        tenantId: tournament.tenantId,
        userId: user.id,
        action: "start_reviewing",
        entityType: "stage",
        entityId: input.stageId,
        metadata: { assignmentCount: assignments.length },
      });

      return { assignmentCount: assignments.length };
    }),

  // Finalize a stage (calculate scores + advance)
  finalizeStage: protectedProcedure
    .input(
      z.object({
        tournamentId: z.string().uuid(),
        stageId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await resolveUser(ctx.userId);
      await verifyTournamentOwnership(input.tournamentId, user.id);

      return advanceStage(input.tournamentId, input.stageId);
    }),

  // Manually resolve ties
  resolveTie: protectedProcedure
    .input(
      z.object({
        tournamentId: z.string().uuid(),
        stageId: z.string().uuid(),
        advancedEntryIds: z.array(z.string().uuid()),
        eliminatedEntryIds: z.array(z.string().uuid()),
        reason: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await resolveUser(ctx.userId);
      const tournament = await verifyTournamentOwnership(
        input.tournamentId,
        user.id
      );

      return resolveManualTie(
        input.tournamentId,
        input.stageId,
        input.advancedEntryIds,
        input.eliminatedEntryIds,
        user.id,
        tournament.tenantId,
        input.reason
      );
    }),

  // Declare tournament winner
  declareWinner: protectedProcedure
    .input(z.object({ tournamentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const user = await resolveUser(ctx.userId);
      const tournament = await verifyTournamentOwnership(
        input.tournamentId,
        user.id
      );

      return declareWinner(input.tournamentId, user.id, tournament.tenantId);
    }),

  // Get stage results (organiser)
  getStageResults: protectedProcedure
    .input(
      z.object({
        tournamentId: z.string().uuid(),
        stageId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = await resolveUser(ctx.userId);
      await verifyTournamentOwnership(input.tournamentId, user.id);

      const stageScores = await db.query.scores.findMany({
        where: eq(scores.stageId, input.stageId),
      });

      const stageEntries = await db.query.entries.findMany({
        where: and(
          eq(entries.tournamentId, input.tournamentId),
          eq(entries.currentStageId, input.stageId)
        ),
      });

      return { scores: stageScores, entries: stageEntries };
    }),

  // Get my score for a stage (entrant)
  getMyScore: protectedProcedure
    .input(
      z.object({
        tournamentId: z.string().uuid(),
        stageId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = await resolveUser(ctx.userId);

      // Find user's entry
      const entry = await db.query.entries.findFirst({
        where: and(
          eq(entries.tournamentId, input.tournamentId),
          eq(entries.userId, user.id)
        ),
      });
      if (!entry) return null;

      return db.query.scores.findFirst({
        where: and(
          eq(scores.entryId, entry.id),
          eq(scores.stageId, input.stageId)
        ),
      });
    }),

  // List stages for a tournament
  list: protectedProcedure
    .input(z.object({ tournamentId: z.string().uuid() }))
    .query(async ({ input }) => {
      return db.query.stages.findMany({
        where: eq(stages.tournamentId, input.tournamentId),
        orderBy: [asc(stages.sortOrder)],
      });
    }),
});
