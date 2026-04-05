import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { db } from "@/db";
import { entries, tournaments, stages, nominations } from "@/db/schema";
import { awardBadge } from "./badge.service";
import { convertNomination } from "./nomination.service";

export async function createEntry(
  tenantId: string,
  tournamentId: string,
  userId: string,
  data: { title: string; description: string; submissionUrl?: string }
) {
  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.id, tournamentId),
  });
  if (!tournament || tournament.status !== "live") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Tournament is not accepting entries.",
    });
  }
  if (tournament.submissionDeadline && new Date() > tournament.submissionDeadline) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Submission deadline has passed.",
    });
  }

  // One entry per user per tournament
  const existing = await db.query.entries.findFirst({
    where: and(
      eq(entries.tournamentId, tournamentId),
      eq(entries.userId, userId)
    ),
  });
  if (existing) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "You already have an entry in this tournament.",
    });
  }

  // Find group stage
  const groupStage = await db.query.stages.findFirst({
    where: and(
      eq(stages.tournamentId, tournamentId),
      eq(stages.type, "group")
    ),
  });

  const [entry] = await db
    .insert(entries)
    .values({
      tenantId,
      tournamentId,
      userId,
      currentStageId: groupStage?.id || null,
      title: data.title,
      description: data.description,
      submissionUrl: data.submissionUrl || null,
      status: "draft",
    })
    .returning();

  return entry;
}

export async function submitEntry(entryId: string, userId: string) {
  const entry = await db.query.entries.findFirst({
    where: and(eq(entries.id, entryId), eq(entries.userId, userId)),
  });
  if (!entry) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Entry not found." });
  }
  if (entry.status !== "draft") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Entry has already been submitted.",
    });
  }

  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.id, entry.tournamentId),
  });
  if (!tournament || tournament.status !== "live") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Tournament is not accepting submissions.",
    });
  }
  if (tournament.submissionDeadline && new Date() > tournament.submissionDeadline) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Submission deadline has passed.",
    });
  }

  const [updated] = await db
    .update(entries)
    .set({ status: "submitted", submittedAt: new Date() })
    .where(eq(entries.id, entryId))
    .returning();

  // Award "entered" badge
  await awardBadge(entry.tenantId, entry.tournamentId, userId, "entered");

  // Check if this user was nominated — convert nomination + mint card for nominator
  await convertNomination(entry.tournamentId, userId);

  return updated;
}

export async function updateEntry(
  entryId: string,
  userId: string,
  data: { title?: string; description?: string; submissionUrl?: string }
) {
  const entry = await db.query.entries.findFirst({
    where: and(eq(entries.id, entryId), eq(entries.userId, userId)),
  });
  if (!entry) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Entry not found." });
  }
  if (entry.status !== "draft") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot edit a submitted entry.",
    });
  }

  const [updated] = await db
    .update(entries)
    .set({
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.submissionUrl !== undefined && { submissionUrl: data.submissionUrl }),
    })
    .where(eq(entries.id, entryId))
    .returning();

  return updated;
}

export async function withdrawEntry(entryId: string, userId: string) {
  const entry = await db.query.entries.findFirst({
    where: and(eq(entries.id, entryId), eq(entries.userId, userId)),
  });
  if (!entry) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Entry not found." });
  }

  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.id, entry.tournamentId),
  });
  if (tournament?.submissionDeadline && new Date() > tournament.submissionDeadline) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot withdraw after the deadline.",
    });
  }

  const [updated] = await db
    .update(entries)
    .set({ status: "withdrawn" })
    .where(eq(entries.id, entryId))
    .returning();

  return updated;
}

export async function getEntry(entryId: string) {
  const entry = await db.query.entries.findFirst({
    where: eq(entries.id, entryId),
  });
  if (!entry) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Entry not found." });
  }
  return entry;
}

export async function listEntries(
  tournamentId: string,
  filters?: { status?: string; page?: number; limit?: number }
) {
  const page = filters?.page || 1;
  const limit = filters?.limit || 50;
  const offset = (page - 1) * limit;

  const conditions = [eq(entries.tournamentId, tournamentId)];
  if (filters?.status) {
    conditions.push(
      eq(entries.status, filters.status as "draft" | "submitted" | "advanced" | "eliminated" | "disqualified" | "withdrawn" | "winner")
    );
  }

  const results = await db.query.entries.findMany({
    where: and(...conditions),
    orderBy: [desc(entries.createdAt)],
    limit,
    offset,
  });

  return results;
}

export async function listMyEntries(userId: string) {
  return db.query.entries.findMany({
    where: eq(entries.userId, userId),
    orderBy: [desc(entries.createdAt)],
  });
}
