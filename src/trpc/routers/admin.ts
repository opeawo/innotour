import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";
import { resolveUser, verifyTournamentOwnership } from "@/lib/helpers/auth";
import { db } from "@/db";
import { entries, auditLog } from "@/db/schema";
import { logAudit } from "@/lib/services/audit.service";

export const adminRouter = createTRPCRouter({
  // Manually advance an entry (organiser)
  manualAdvance: protectedProcedure
    .input(
      z.object({
        tournamentId: z.string().uuid(),
        entryId: z.string().uuid(),
        reason: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await resolveUser(ctx.userId);
      const tournament = await verifyTournamentOwnership(
        input.tournamentId,
        user.id
      );

      const entry = await db.query.entries.findFirst({
        where: eq(entries.id, input.entryId),
      });
      if (!entry || entry.tournamentId !== input.tournamentId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Entry not found in this tournament.",
        });
      }

      const [updated] = await db
        .update(entries)
        .set({ status: "advanced" })
        .where(eq(entries.id, input.entryId))
        .returning();

      await logAudit({
        tenantId: tournament.tenantId,
        userId: user.id,
        action: "manual_advance",
        entityType: "entry",
        entityId: input.entryId,
        reason: input.reason,
      });

      return updated;
    }),

  // Manually eliminate an entry (organiser)
  manualEliminate: protectedProcedure
    .input(
      z.object({
        tournamentId: z.string().uuid(),
        entryId: z.string().uuid(),
        reason: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await resolveUser(ctx.userId);
      const tournament = await verifyTournamentOwnership(
        input.tournamentId,
        user.id
      );

      const entry = await db.query.entries.findFirst({
        where: eq(entries.id, input.entryId),
      });
      if (!entry || entry.tournamentId !== input.tournamentId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Entry not found in this tournament.",
        });
      }

      const [updated] = await db
        .update(entries)
        .set({ status: "eliminated" })
        .where(eq(entries.id, input.entryId))
        .returning();

      await logAudit({
        tenantId: tournament.tenantId,
        userId: user.id,
        action: "manual_eliminate",
        entityType: "entry",
        entityId: input.entryId,
        reason: input.reason,
      });

      return updated;
    }),

  // Flag an entry (any authenticated user)
  flagEntry: protectedProcedure
    .input(
      z.object({
        entryId: z.string().uuid(),
        reason: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await resolveUser(ctx.userId);

      const entry = await db.query.entries.findFirst({
        where: eq(entries.id, input.entryId),
      });
      if (!entry) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Entry not found." });
      }

      await logAudit({
        tenantId: entry.tenantId,
        userId: user.id,
        action: "flag_entry",
        entityType: "entry",
        entityId: input.entryId,
        reason: input.reason,
      });

      return { success: true };
    }),

  // Get audit log (organiser)
  getAuditLog: protectedProcedure
    .input(
      z.object({
        tournamentId: z.string().uuid(),
        page: z.number().int().positive().optional().default(1),
        limit: z.number().int().positive().max(100).optional().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = await resolveUser(ctx.userId);
      await verifyTournamentOwnership(input.tournamentId, user.id);

      const offset = (input.page - 1) * input.limit;

      // Audit logs for this tournament (entity_id = tournament or entries in tournament)
      const logs = await db.query.auditLog.findMany({
        where: eq(auditLog.tenantId, user.tenantId!),
        orderBy: [desc(auditLog.createdAt)],
        limit: input.limit,
        offset,
      });

      return logs;
    }),
});
