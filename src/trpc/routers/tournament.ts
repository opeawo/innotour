import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "../init";
import { db } from "@/db";
import {
  tournaments,
  users,
  rubricCriteria,
  stages,
} from "@/db/schema";
import {
  stepBasicsSchema,
  stepBrandingSchema,
  stepSubmissionTypeSchema,
  stepTargetEntriesSchema,
  stepDeadlineSchema,
  stepRubricSchema,
  stepJudgePanelSchema,
} from "@/lib/validators/tournament";
import { calculateStages } from "@/lib/stage-algorithm";
import { TRPCError } from "@trpc/server";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 100);
}

async function resolveUser(clerkId: string) {
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

async function verifyTournamentOwnership(
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

export const tournamentRouter = createTRPCRouter({
  // Create a draft tournament
  createDraft: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const user = await resolveUser(ctx.userId);

      const slug = slugify(input.name) + "-" + Date.now().toString(36);
      const tenantId = user.tenantId;

      // If user has no tenant, create a personal one
      let effectiveTenantId = tenantId;
      if (!effectiveTenantId) {
        const { tenants } = await import("@/db/schema");
        const [tenant] = await db
          .insert(tenants)
          .values({
            name: user.fullName + "'s Organisation",
            slug: user.clerkId.slice(0, 20) + "-org",
          })
          .returning();
        effectiveTenantId = tenant.id;
        await db
          .update(users)
          .set({ tenantId: tenant.id, role: "organiser" })
          .where(eq(users.id, user.id));
      }

      const [tournament] = await db
        .insert(tournaments)
        .values({
          tenantId: effectiveTenantId,
          organiserId: user.id,
          name: input.name,
          slug,
          submissionType: "file_upload",
          status: "draft",
        })
        .returning();

      return { id: tournament.id, slug: tournament.slug };
    }),

  // Update a specific step
  updateStep: protectedProcedure
    .input(
      z.object({
        tournamentId: z.string().uuid(),
        step: z.number().int().min(1).max(7),
        data: z.record(z.string(), z.unknown()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await resolveUser(ctx.userId);
      await verifyTournamentOwnership(input.tournamentId, user.id);

      const { step, data, tournamentId } = input;

      switch (step) {
        case 1: {
          const parsed = stepBasicsSchema.parse(data);
          await db
            .update(tournaments)
            .set({
              name: parsed.name,
              description: parsed.description || null,
              prizeDescription: parsed.prizeDescription || null,
            })
            .where(eq(tournaments.id, tournamentId));
          break;
        }
        case 2: {
          const parsed = stepBrandingSchema.parse(data);
          await db
            .update(tournaments)
            .set({
              logoUrl: parsed.logoUrl || null,
              bannerUrl: parsed.bannerUrl || null,
              primaryColor: parsed.primaryColor,
            })
            .where(eq(tournaments.id, tournamentId));
          break;
        }
        case 3: {
          const parsed = stepSubmissionTypeSchema.parse(data);
          await db
            .update(tournaments)
            .set({ submissionType: parsed.submissionType })
            .where(eq(tournaments.id, tournamentId));
          break;
        }
        case 4: {
          const parsed = stepTargetEntriesSchema.parse(data);
          await db
            .update(tournaments)
            .set({ targetEntries: parsed.targetEntries ?? null })
            .where(eq(tournaments.id, tournamentId));
          break;
        }
        case 5: {
          const parsed = stepDeadlineSchema.parse(data);
          await db
            .update(tournaments)
            .set({
              submissionDeadline: new Date(parsed.submissionDeadline),
            })
            .where(eq(tournaments.id, tournamentId));
          break;
        }
        case 6: {
          const parsed = stepRubricSchema.parse(data);
          // Delete existing criteria and re-insert
          await db
            .delete(rubricCriteria)
            .where(eq(rubricCriteria.tournamentId, tournamentId));
          if (parsed.criteria.length > 0) {
            await db.insert(rubricCriteria).values(
              parsed.criteria.map((c) => ({
                tournamentId,
                name: c.name,
                description: c.description || null,
                sortOrder: c.sortOrder,
              }))
            );
          }
          break;
        }
        case 7: {
          const parsed = stepJudgePanelSchema.parse(data);
          await db
            .update(tournaments)
            .set({
              enableJudgePanel: parsed.enableJudgePanel,
              settings: { judgeEmails: parsed.judgeEmails },
            })
            .where(eq(tournaments.id, tournamentId));
          break;
        }
      }

      return { success: true };
    }),

  // Publish tournament
  publish: protectedProcedure
    .input(z.object({ tournamentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const user = await resolveUser(ctx.userId);
      const tournament = await verifyTournamentOwnership(
        input.tournamentId,
        user.id
      );

      // Validate completeness
      if (!tournament.name) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Tournament name is required.",
        });
      }
      if (!tournament.submissionDeadline) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Submission deadline is required.",
        });
      }

      const criteria = await db.query.rubricCriteria.findMany({
        where: eq(rubricCriteria.tournamentId, input.tournamentId),
      });
      if (criteria.length < 3) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "At least 3 scoring criteria are required.",
        });
      }

      // Calculate stages
      const entryCount = tournament.targetEntries || 64;
      const stagesPreviews = calculateStages(entryCount, tournament.finalSize);

      // Delete existing stages and re-create
      await db
        .delete(stages)
        .where(eq(stages.tournamentId, input.tournamentId));

      await db.insert(stages).values(
        stagesPreviews.map((s) => ({
          tournamentId: input.tournamentId,
          type: s.type,
          sortOrder: s.sortOrder,
          advanceCount: s.advanceCount,
        }))
      );

      // Set status to live
      await db
        .update(tournaments)
        .set({ status: "live" })
        .where(eq(tournaments.id, input.tournamentId));

      return { success: true, slug: tournament.slug };
    }),

  // Get draft tournament for resuming wizard
  getDraft: protectedProcedure
    .input(z.object({ tournamentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const user = await resolveUser(ctx.userId);
      const tournament = await verifyTournamentOwnership(
        input.tournamentId,
        user.id
      );

      const criteria = await db.query.rubricCriteria.findMany({
        where: eq(rubricCriteria.tournamentId, input.tournamentId),
        orderBy: (rc, { asc }) => [asc(rc.sortOrder)],
      });

      return { tournament, criteria };
    }),
});
