import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { tournaments } from "./tournaments";
import { users } from "./users";
import { badgeType } from "./enums";

export const badges = pgTable("badges", {
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
  type: badgeType("type").notNull(),
  imageUrl: text("image_url"),
  publicUrl: text("public_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
