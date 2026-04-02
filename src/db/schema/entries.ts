import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { tournaments } from "./tournaments";
import { users } from "./users";
import { stages } from "./stages";
import { entryStatus } from "./enums";

export const entries = pgTable("entries", {
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
  currentStageId: uuid("current_stage_id").references(() => stages.id),
  title: varchar("title", { length: 100 }).notNull(),
  description: text("description").notNull(),
  submissionUrl: text("submission_url"),
  submissionFileKey: text("submission_file_key"),
  status: entryStatus("status").notNull().default("draft"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
