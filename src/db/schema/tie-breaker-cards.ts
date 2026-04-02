import { pgTable, uuid, timestamp } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { tournaments } from "./tournaments";
import { users } from "./users";
import { stages } from "./stages";

export const tieBreakerCards = pgTable("tie_breaker_cards", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id, { onDelete: "cascade" })
    .notNull(),
  tournamentId: uuid("tournament_id")
    .references(() => tournaments.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  usedAtStageId: uuid("used_at_stage_id").references(() => stages.id),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
