import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { badges } from "@/db/schema";

export async function awardBadge(
  tenantId: string,
  tournamentId: string,
  userId: string,
  type: "entered" | "reviewer" | "stage_1_achiever" | "stage_2_achiever" | "finalist" | "winner"
) {
  // Idempotent: skip if badge already exists
  const existing = await db.query.badges.findFirst({
    where: and(
      eq(badges.tournamentId, tournamentId),
      eq(badges.userId, userId),
      eq(badges.type, type)
    ),
  });
  if (existing) return existing;

  const [badge] = await db
    .insert(badges)
    .values({ tenantId, tournamentId, userId, type })
    .returning();
  return badge;
}

export async function getUserBadges(userId: string, tournamentId?: string) {
  if (tournamentId) {
    return db.query.badges.findMany({
      where: and(eq(badges.userId, userId), eq(badges.tournamentId, tournamentId)),
    });
  }
  return db.query.badges.findMany({
    where: eq(badges.userId, userId),
  });
}
