import {
  pgTable,
  uuid,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { tournaments } from "./tournaments";
import { stageType, stageStatus } from "./enums";

export const stages = pgTable("stages", {
  id: uuid("id").defaultRandom().primaryKey(),
  tournamentId: uuid("tournament_id")
    .references(() => tournaments.id, { onDelete: "cascade" })
    .notNull(),
  type: stageType("type").notNull(),
  status: stageStatus("status").notNull().default("pending"),
  sortOrder: integer("sort_order").notNull(),
  advanceCount: integer("advance_count").notNull(),
  reviewsPerReviewer: integer("reviews_per_reviewer"),
  reviewDeadline: timestamp("review_deadline", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
