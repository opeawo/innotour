import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { nominations, tieBreakerCards, users } from "@/db/schema";

export async function nominate(
  tenantId: string,
  tournamentId: string,
  nominatorId: string,
  nominees: { name: string; email: string }[]
) {
  const inserted = [];
  for (const nominee of nominees) {
    // Skip duplicates (same email in same tournament)
    const existing = await db.query.nominations.findFirst({
      where: and(
        eq(nominations.tournamentId, tournamentId),
        eq(nominations.nomineeEmail, nominee.email)
      ),
    });
    if (existing) continue;

    // Check if nominee already has a user account
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, nominee.email),
    });

    const [nom] = await db
      .insert(nominations)
      .values({
        tenantId,
        tournamentId,
        nominatorId,
        nomineeName: nominee.name,
        nomineeEmail: nominee.email,
        nomineeUserId: existingUser?.id || null,
      })
      .returning();
    inserted.push(nom);
  }
  return inserted;
}

export async function convertNomination(
  tournamentId: string,
  nomineeUserId: string
) {
  // Find the user's email
  const user = await db.query.users.findFirst({
    where: eq(users.id, nomineeUserId),
  });
  if (!user) return;

  // Find unconverted nomination matching this email
  const nomination = await db.query.nominations.findFirst({
    where: and(
      eq(nominations.tournamentId, tournamentId),
      eq(nominations.nomineeEmail, user.email),
      eq(nominations.converted, false)
    ),
  });
  if (!nomination) return;

  // Mark converted
  await db
    .update(nominations)
    .set({
      converted: true,
      nomineeUserId,
      convertedAt: new Date(),
    })
    .where(eq(nominations.id, nomination.id));

  // Mint tie-breaker card for nominator
  await mintCard(nomination.tenantId, tournamentId, nomination.nominatorId);
}

export async function mintCard(
  tenantId: string,
  tournamentId: string,
  userId: string
) {
  const [card] = await db
    .insert(tieBreakerCards)
    .values({ tenantId, tournamentId, userId })
    .returning();
  return card;
}

export async function getUserCards(tournamentId: string, userId: string) {
  const cards = await db.query.tieBreakerCards.findMany({
    where: and(
      eq(tieBreakerCards.tournamentId, tournamentId),
      eq(tieBreakerCards.userId, userId)
    ),
  });
  const unused = cards.filter((c) => !c.usedAt);
  return { total: cards.length, unused: unused.length, cards };
}

export async function listNominations(
  tournamentId: string,
  nominatorId?: string
) {
  if (nominatorId) {
    return db.query.nominations.findMany({
      where: and(
        eq(nominations.tournamentId, tournamentId),
        eq(nominations.nominatorId, nominatorId)
      ),
    });
  }
  return db.query.nominations.findMany({
    where: eq(nominations.tournamentId, tournamentId),
  });
}
