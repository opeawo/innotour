import { eq, and, or } from "drizzle-orm";
import { db } from "@/db";
import { entries, reviews, stages, users, tournaments } from "@/db/schema";
import { reviewsPerReviewer } from "@/lib/stage-algorithm";
import { sql } from "drizzle-orm";

/**
 * Fisher-Yates shuffle (in-place)
 */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Assign peer reviewers for a stage using round-robin after shuffle.
 * Guarantees no self-review.
 */
export async function assignReviewers(tournamentId: string, stageId: string) {
  // Get the stage to find the tournament's tenant
  const stage = await db.query.stages.findFirst({
    where: eq(stages.id, stageId),
  });
  if (!stage) throw new Error("Stage not found");

  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.id, tournamentId),
  });
  if (!tournament) throw new Error("Tournament not found");

  // Get all eligible entries (submitted or advanced into this stage)
  const stageEntries = await db.query.entries.findMany({
    where: and(
      eq(entries.tournamentId, tournamentId),
      eq(entries.currentStageId, stageId),
      or(eq(entries.status, "submitted"), eq(entries.status, "advanced"))
    ),
  });

  if (stageEntries.length < 2) return [];

  const R = reviewsPerReviewer(stageEntries.length);
  const shuffled = shuffle([...stageEntries]);
  const N = shuffled.length;

  const reviewRows: {
    tenantId: string;
    entryId: string;
    reviewerId: string;
    stageId: string;
  }[] = [];

  // For entry at position i, assign reviewers from positions (i+1)%N through (i+R)%N
  for (let i = 0; i < N; i++) {
    const entry = shuffled[i];
    for (let r = 1; r <= R; r++) {
      const reviewerIdx = (i + r) % N;
      const reviewer = shuffled[reviewerIdx];
      reviewRows.push({
        tenantId: tournament.tenantId,
        entryId: entry.id,
        reviewerId: reviewer.userId,
        stageId,
      });
    }
  }

  if (reviewRows.length > 0) {
    await db.insert(reviews).values(reviewRows);
  }

  // Update stage with reviewsPerReviewer
  await db
    .update(stages)
    .set({ reviewsPerReviewer: R })
    .where(eq(stages.id, stageId));

  return reviewRows;
}

/**
 * Reassign reviews from a disqualified user to reviewers with lowest load.
 */
export async function redistributeReviews(
  stageId: string,
  disqualifiedUserId: string
) {
  // Find unsubmitted reviews assigned to the disqualified user
  const pendingReviews = await db.query.reviews.findMany({
    where: and(
      eq(reviews.stageId, stageId),
      eq(reviews.reviewerId, disqualifiedUserId)
    ),
  });
  const unsubmitted = pendingReviews.filter((r) => !r.submittedAt);

  if (unsubmitted.length === 0) return;

  // Get all reviewers in this stage (excluding disqualified)
  const allReviews = await db.query.reviews.findMany({
    where: eq(reviews.stageId, stageId),
  });

  // Count reviews per reviewer (excluding disqualified)
  const countMap = new Map<string, number>();
  for (const r of allReviews) {
    if (r.reviewerId === disqualifiedUserId) continue;
    countMap.set(r.reviewerId, (countMap.get(r.reviewerId) || 0) + 1);
  }

  for (const review of unsubmitted) {
    // Find reviewer with lowest count
    let minReviewer = "";
    let minCount = Infinity;
    for (const [rid, count] of countMap) {
      if (count < minCount) {
        minCount = count;
        minReviewer = rid;
      }
    }

    if (minReviewer) {
      await db
        .update(reviews)
        .set({ reviewerId: minReviewer })
        .where(eq(reviews.id, review.id));
      countMap.set(minReviewer, (countMap.get(minReviewer) || 0) + 1);
    }
  }
}

/**
 * Create expert review assignments for the final stage judges.
 */
export async function assignExpertReviewers(
  tournamentId: string,
  stageId: string
) {
  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.id, tournamentId),
  });
  if (!tournament || !tournament.enableJudgePanel) return [];

  const judgeEmails =
    (tournament.settings as { judgeEmails?: string[] })?.judgeEmails || [];
  if (judgeEmails.length === 0) return [];

  // Find judge user accounts
  const judgeUsers: { id: string }[] = [];
  for (const email of judgeEmails) {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    if (user) judgeUsers.push(user);
  }

  if (judgeUsers.length === 0) return [];

  // Get all entries in this stage
  const stageEntries = await db.query.entries.findMany({
    where: and(
      eq(entries.tournamentId, tournamentId),
      eq(entries.currentStageId, stageId),
      or(eq(entries.status, "submitted"), eq(entries.status, "advanced"))
    ),
  });

  const reviewRows: {
    tenantId: string;
    entryId: string;
    reviewerId: string;
    stageId: string;
    isExpert: boolean;
  }[] = [];

  // Each judge reviews every entry in the final
  for (const entry of stageEntries) {
    for (const judge of judgeUsers) {
      reviewRows.push({
        tenantId: tournament.tenantId,
        entryId: entry.id,
        reviewerId: judge.id,
        stageId,
        isExpert: true,
      });
    }
  }

  if (reviewRows.length > 0) {
    await db.insert(reviews).values(reviewRows);
  }

  return reviewRows;
}
