import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { db } from "@/db";
import { users, tournaments, entries } from "@/db/schema";

export async function resolveUser(clerkId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  });
  if (!user) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "User not found. Please complete onboarding.",
    });
  }
  return user;
}

export async function verifyTournamentOwnership(
  tournamentId: string,
  userId: string
) {
  const tournament = await db.query.tournaments.findFirst({
    where: and(
      eq(tournaments.id, tournamentId),
      eq(tournaments.organiserId, userId)
    ),
  });
  if (!tournament) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Tournament not found.",
    });
  }
  return tournament;
}

export async function getTournamentById(tournamentId: string) {
  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.id, tournamentId),
  });
  if (!tournament) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Tournament not found.",
    });
  }
  return tournament;
}

export async function verifyEntrant(tournamentId: string, userId: string) {
  const entry = await db.query.entries.findFirst({
    where: and(
      eq(entries.tournamentId, tournamentId),
      eq(entries.userId, userId)
    ),
  });
  return entry;
}
