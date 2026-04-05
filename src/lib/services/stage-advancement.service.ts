import { eq, and, or, asc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { db } from "@/db";
import {
  entries,
  stages,
  tournaments,
  tieBreakerCards,
  reviews,
} from "@/db/schema";
import { calculateScores } from "./scoring.service";
import { awardBadge } from "./badge.service";
import { logAudit } from "./audit.service";

type StageType = "group" | "semi_final" | "final";

const STAGE_BADGE_MAP: Record<StageType, "stage_1_achiever" | "stage_2_achiever" | "finalist" | null> = {
  group: "stage_1_achiever",
  semi_final: "stage_2_achiever",
  final: "finalist",
};

const STAGE_STATUS_MAP: Record<StageType, string> = {
  group: "stage_1",
  semi_final: "stage_2",
  final: "stage_3",
};

export async function advanceStage(tournamentId: string, stageId: string) {
  const stage = await db.query.stages.findFirst({
    where: eq(stages.id, stageId),
  });
  if (!stage) throw new TRPCError({ code: "NOT_FOUND", message: "Stage not found." });

  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.id, tournamentId),
  });
  if (!tournament) throw new TRPCError({ code: "NOT_FOUND", message: "Tournament not found." });

  // Calculate scores
  const ranked = await calculateScores(tournamentId, stageId);

  const advanceCount = stage.advanceCount;

  // Find entries with 0 reviews
  const flaggedEntries: string[] = [];
  for (const r of ranked) {
    const entryReviews = await db.query.reviews.findMany({
      where: and(eq(reviews.entryId, r.entryId), eq(reviews.stageId, stageId)),
    });
    const submitted = entryReviews.filter((rv) => rv.submittedAt);
    if (submitted.length === 0) {
      flaggedEntries.push(r.entryId);
    }
  }

  // Determine cut-off
  if (ranked.length <= advanceCount) {
    // Everyone advances
    for (const r of ranked) {
      await setEntryAdvanced(r.entryId, tournamentId, stageId, stage.type as StageType, tournament.tenantId);
    }
    await completeStage(stageId, tournamentId, stage.type as StageType);
    return { advanced: ranked.map((r) => r.entryId), eliminated: [], pendingTies: [], flaggedEntries };
  }

  const cutoffScore = ranked[advanceCount - 1].composite;

  // Entries clearly above cutoff
  const clearlyAdvanced = ranked.filter(
    (r, i) => i < advanceCount && r.composite > cutoffScore
  );
  // Entries clearly below cutoff
  const clearlyEliminated = ranked.filter((r) => r.composite < cutoffScore);
  // Entries tied at cutoff
  const tiedAtBoundary = ranked.filter((r) => r.composite === cutoffScore);

  const slotsRemaining = advanceCount - clearlyAdvanced.length;

  // Try to resolve ties with tie-breaker cards
  const tieResolved: string[] = [];
  const tieUnresolved: string[] = [];

  for (const tied of tiedAtBoundary) {
    if (tieResolved.length < slotsRemaining) {
      // Check for unused card
      const card = await db.query.tieBreakerCards.findFirst({
        where: and(
          eq(tieBreakerCards.tournamentId, tournamentId),
          eq(tieBreakerCards.userId, (await db.query.entries.findFirst({ where: eq(entries.id, tied.entryId) }))!.userId),
        ),
      });
      const unusedCard = card && !card.usedAt ? card : null;

      if (unusedCard) {
        // Use the card
        await db
          .update(tieBreakerCards)
          .set({ usedAtStageId: stageId, usedAt: new Date() })
          .where(eq(tieBreakerCards.id, unusedCard.id));
        tieResolved.push(tied.entryId);
      } else {
        tieUnresolved.push(tied.entryId);
      }
    } else {
      tieUnresolved.push(tied.entryId);
    }
  }

  // If we still have slots and unresolved ties fill them
  const finalAdvanced = [...clearlyAdvanced.map((r) => r.entryId), ...tieResolved];
  const stillNeedSlots = slotsRemaining - tieResolved.length;

  if (stillNeedSlots > 0 && tieUnresolved.length > 0) {
    if (tieUnresolved.length <= stillNeedSlots) {
      // All tied entries can advance
      finalAdvanced.push(...tieUnresolved);
      tieUnresolved.length = 0;
    } else {
      // Need manual resolution
      return {
        advanced: finalAdvanced,
        eliminated: clearlyEliminated.map((r) => r.entryId),
        pendingTies: tieUnresolved,
        needsManualResolution: true,
        flaggedEntries,
      };
    }
  }

  // Set statuses
  const nextStage = await getNextStage(tournamentId, stage.sortOrder);

  for (const entryId of finalAdvanced) {
    await setEntryAdvanced(entryId, tournamentId, stageId, stage.type as StageType, tournament.tenantId, nextStage?.id);
  }

  const eliminated = [
    ...clearlyEliminated.map((r) => r.entryId),
    ...tieUnresolved,
  ];
  for (const entryId of eliminated) {
    await db
      .update(entries)
      .set({ status: "eliminated" })
      .where(eq(entries.id, entryId));
  }

  await completeStage(stageId, tournamentId, stage.type as StageType);

  return {
    advanced: finalAdvanced,
    eliminated,
    pendingTies: [],
    flaggedEntries,
  };
}

async function setEntryAdvanced(
  entryId: string,
  tournamentId: string,
  stageId: string,
  stageType: StageType,
  tenantId: string,
  nextStageId?: string
) {
  const entry = await db.query.entries.findFirst({
    where: eq(entries.id, entryId),
  });
  if (!entry) return;

  await db
    .update(entries)
    .set({
      status: "advanced",
      currentStageId: nextStageId || entry.currentStageId,
    })
    .where(eq(entries.id, entryId));

  const badgeType = STAGE_BADGE_MAP[stageType];
  if (badgeType) {
    await awardBadge(tenantId, tournamentId, entry.userId, badgeType);
  }
}

async function getNextStage(tournamentId: string, currentSortOrder: number) {
  const allStages = await db.query.stages.findMany({
    where: eq(stages.tournamentId, tournamentId),
    orderBy: [asc(stages.sortOrder)],
  });
  return allStages.find((s) => s.sortOrder > currentSortOrder) || null;
}

async function completeStage(
  stageId: string,
  tournamentId: string,
  stageType: StageType
) {
  await db
    .update(stages)
    .set({ status: "complete", completedAt: new Date() })
    .where(eq(stages.id, stageId));

  // Update tournament status
  const statusValue = STAGE_STATUS_MAP[stageType];
  if (statusValue) {
    await db
      .update(tournaments)
      .set({
        status: statusValue as "stage_1" | "stage_2" | "stage_3",
      })
      .where(eq(tournaments.id, tournamentId));
  }
}

export async function resolveManualTie(
  tournamentId: string,
  stageId: string,
  advancedEntryIds: string[],
  eliminatedEntryIds: string[],
  userId: string,
  tenantId: string,
  reason: string
) {
  const stage = await db.query.stages.findFirst({
    where: eq(stages.id, stageId),
  });
  if (!stage) throw new TRPCError({ code: "NOT_FOUND", message: "Stage not found." });

  const nextStage = await getNextStage(tournamentId, stage.sortOrder);

  for (const entryId of advancedEntryIds) {
    await setEntryAdvanced(entryId, tournamentId, stageId, stage.type as StageType, tenantId, nextStage?.id);
  }
  for (const entryId of eliminatedEntryIds) {
    await db
      .update(entries)
      .set({ status: "eliminated" })
      .where(eq(entries.id, entryId));
  }

  await logAudit({
    tenantId,
    userId,
    action: "resolve_tie",
    entityType: "stage",
    entityId: stageId,
    reason,
    metadata: { advancedEntryIds, eliminatedEntryIds },
  });

  await completeStage(stageId, tournamentId, stage.type as StageType);
}

export async function declareWinner(tournamentId: string, userId: string, tenantId: string) {
  // Get the final stage
  const finalStage = await db.query.stages.findFirst({
    where: and(
      eq(stages.tournamentId, tournamentId),
      eq(stages.type, "final")
    ),
  });
  if (!finalStage) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Final stage not found." });
  }

  // Calculate final scores
  const ranked = await calculateScores(tournamentId, finalStage.id);

  if (ranked.length === 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "No entries to score." });
  }

  // Top entry is the winner
  const winnerId = ranked[0].entryId;
  const winnerEntry = await db.query.entries.findFirst({
    where: eq(entries.id, winnerId),
  });

  await db
    .update(entries)
    .set({ status: "winner" })
    .where(eq(entries.id, winnerId));

  // Award winner badge
  if (winnerEntry) {
    await awardBadge(tenantId, tournamentId, winnerEntry.userId, "winner");
  }

  // Mark tournament complete
  await db
    .update(tournaments)
    .set({ status: "complete" })
    .where(eq(tournaments.id, tournamentId));

  // Complete the final stage
  await db
    .update(stages)
    .set({ status: "complete", completedAt: new Date() })
    .where(eq(stages.id, finalStage.id));

  await logAudit({
    tenantId,
    userId,
    action: "declare_winner",
    entityType: "tournament",
    entityId: tournamentId,
    metadata: { winnerId },
  });

  return { winnerId, winnerEntry };
}
