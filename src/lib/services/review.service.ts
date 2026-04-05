import { eq, and, isNull, isNotNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { db } from "@/db";
import { reviews, entries, rubricCriteria } from "@/db/schema";
import { awardBadge } from "./badge.service";

export async function getMyReviewQueue(userId: string, tournamentId: string) {
  const allReviews = await db.query.reviews.findMany({
    where: eq(reviews.reviewerId, userId),
  });

  // Filter to reviews for entries in this tournament
  const entryIds = allReviews.map((r) => r.entryId);
  if (entryIds.length === 0) return [];

  const relatedEntries = await db.query.entries.findMany({
    where: eq(entries.tournamentId, tournamentId),
  });
  const tournamentEntryIds = new Set(relatedEntries.map((e) => e.id));

  return allReviews
    .filter((r) => tournamentEntryIds.has(r.entryId))
    .map((r) => ({
      ...r,
      isPending: !r.submittedAt,
    }));
}

export async function getReviewDetail(reviewId: string, userId: string) {
  const review = await db.query.reviews.findFirst({
    where: and(eq(reviews.id, reviewId), eq(reviews.reviewerId, userId)),
  });
  if (!review) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Review not found or not assigned to you.",
    });
  }

  // Get the entry (anonymized — no userId)
  const entry = await db.query.entries.findFirst({
    where: eq(entries.id, review.entryId),
  });

  // Get rubric criteria for this tournament
  const criteria = entry
    ? await db.query.rubricCriteria.findMany({
        where: eq(rubricCriteria.tournamentId, entry.tournamentId),
        orderBy: (rc, { asc }) => [asc(rc.sortOrder)],
      })
    : [];

  return {
    review,
    entry: entry
      ? {
          id: entry.id,
          title: entry.title,
          description: entry.description,
          submissionUrl: entry.submissionUrl,
        }
      : null,
    criteria,
  };
}

export async function submitReview(
  reviewId: string,
  userId: string,
  criteriaScores: { criterionId: string; score: number; feedback: string }[]
) {
  const review = await db.query.reviews.findFirst({
    where: and(eq(reviews.id, reviewId), eq(reviews.reviewerId, userId)),
  });
  if (!review) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Review not found or not assigned to you.",
    });
  }
  if (review.submittedAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Review has already been submitted.",
    });
  }

  // Validate scores are 1-5
  for (const cs of criteriaScores) {
    if (cs.score < 1 || cs.score > 5) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Score must be between 1 and 5. Got ${cs.score}.`,
      });
    }
  }

  const [updated] = await db
    .update(reviews)
    .set({
      criteriaScores,
      submittedAt: new Date(),
    })
    .where(eq(reviews.id, reviewId))
    .returning();

  // Check if all assigned reviews for this user in this stage are done
  const stageReviews = await db.query.reviews.findMany({
    where: and(
      eq(reviews.reviewerId, userId),
      eq(reviews.stageId, review.stageId)
    ),
  });
  const allDone = stageReviews.every((r) => r.submittedAt !== null);
  if (allDone) {
    // Award reviewer badge
    const entry = await db.query.entries.findFirst({
      where: eq(entries.id, review.entryId),
    });
    if (entry) {
      await awardBadge(review.tenantId, entry.tournamentId, userId, "reviewer");
    }
  }

  return updated;
}
