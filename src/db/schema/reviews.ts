import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { entries } from "./entries";
import { users } from "./users";
import { stages } from "./stages";

export type CriterionScore = {
  criterionId: string;
  score: number;
  feedback: string;
};

export const reviews = pgTable("reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id, { onDelete: "cascade" })
    .notNull(),
  entryId: uuid("entry_id")
    .references(() => entries.id, { onDelete: "cascade" })
    .notNull(),
  reviewerId: uuid("reviewer_id")
    .references(() => users.id)
    .notNull(),
  stageId: uuid("stage_id")
    .references(() => stages.id)
    .notNull(),
  isExpert: boolean("is_expert").notNull().default(false),
  criteriaScores: jsonb("criteria_scores")
    .$type<CriterionScore[]>()
    .notNull()
    .default([]),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
