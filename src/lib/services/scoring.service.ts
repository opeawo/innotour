import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import {
  reviews,
  entries,
  scores,
  rubricCriteria,
  tournaments,
} from "@/db/schema";
import type { CriterionScore } from "@/db/schema/reviews";
import type { CriterionAverage } from "@/db/schema/scores";

export async function calculateScores(tournamentId: string, stageId: string) {
  // Get all entries in this stage
  const stageEntries = await db.query.entries.findMany({
    where: and(
      eq(entries.tournamentId, tournamentId),
      eq(entries.currentStageId, stageId)
    ),
  });

  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.id, tournamentId),
  });

  // Get criteria for this tournament
  const criteria = await db.query.rubricCriteria.findMany({
    where: eq(rubricCriteria.tournamentId, tournamentId),
  });
  const criteriaIds = criteria.map((c) => c.id);

  const scoreResults: {
    entryId: string;
    peerAvg: number;
    expertAvg: number | null;
    composite: number;
    criterionAverages: CriterionAverage[];
  }[] = [];

  for (const entry of stageEntries) {
    const entryReviews = await db.query.reviews.findMany({
      where: and(eq(reviews.entryId, entry.id), eq(reviews.stageId, stageId)),
    });

    const peerReviews = entryReviews.filter(
      (r) => !r.isExpert && r.submittedAt
    );
    const expertReviews = entryReviews.filter(
      (r) => r.isExpert && r.submittedAt
    );

    // Calculate peer average per criterion
    const criterionPeerAverages: CriterionAverage[] = criteriaIds.map(
      (criterionId) => {
        const scoresForCriterion = peerReviews
          .flatMap((r) => (r.criteriaScores as CriterionScore[]) || [])
          .filter((cs) => cs.criterionId === criterionId);
        const avg =
          scoresForCriterion.length > 0
            ? scoresForCriterion.reduce((sum, cs) => sum + cs.score, 0) /
              scoresForCriterion.length
            : 0;
        return { criterionId, average: Math.round(avg * 100) / 100 };
      }
    );

    const peerAvg =
      criterionPeerAverages.length > 0
        ? criterionPeerAverages.reduce((sum, ca) => sum + ca.average, 0) /
          criterionPeerAverages.length
        : 0;

    // Calculate expert average (if applicable)
    let expertAvg: number | null = null;
    if (expertReviews.length > 0) {
      const expertCriterionAvgs = criteriaIds.map((criterionId) => {
        const scoresForCriterion = expertReviews
          .flatMap((r) => (r.criteriaScores as CriterionScore[]) || [])
          .filter((cs) => cs.criterionId === criterionId);
        return scoresForCriterion.length > 0
          ? scoresForCriterion.reduce((sum, cs) => sum + cs.score, 0) /
              scoresForCriterion.length
          : 0;
      });
      expertAvg =
        expertCriterionAvgs.reduce((sum, a) => sum + a, 0) /
        expertCriterionAvgs.length;
    }

    // Composite: 50/50 peer + expert in final with judges, else pure peer
    let composite = peerAvg;
    if (expertAvg !== null && tournament?.enableJudgePanel) {
      composite = peerAvg * 0.5 + expertAvg * 0.5;
    }

    composite = Math.round(composite * 100) / 100;

    scoreResults.push({
      entryId: entry.id,
      peerAvg: Math.round(peerAvg * 100) / 100,
      expertAvg: expertAvg !== null ? Math.round(expertAvg * 100) / 100 : null,
      composite,
      criterionAverages: criterionPeerAverages,
    });
  }

  // Rank by composite descending
  scoreResults.sort((a, b) => b.composite - a.composite);

  // Upsert scores
  for (let i = 0; i < scoreResults.length; i++) {
    const sr = scoreResults[i];
    const rank = i + 1;

    // Delete existing score for this entry+stage then insert
    await db
      .delete(scores)
      .where(
        and(eq(scores.entryId, sr.entryId), eq(scores.stageId, stageId))
      );

    await db.insert(scores).values({
      entryId: sr.entryId,
      stageId,
      peerAvg: sr.peerAvg,
      expertAvg: sr.expertAvg,
      composite: sr.composite,
      rank,
      criterionAverages: sr.criterionAverages,
    });
  }

  return scoreResults.map((sr, i) => ({ ...sr, rank: i + 1 }));
}

export async function getEntryScore(entryId: string, stageId: string) {
  return db.query.scores.findFirst({
    where: and(eq(scores.entryId, entryId), eq(scores.stageId, stageId)),
  });
}
