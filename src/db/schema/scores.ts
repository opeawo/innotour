import {
  pgTable,
  uuid,
  real,
  integer,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { entries } from "./entries";
import { stages } from "./stages";

export type CriterionAverage = {
  criterionId: string;
  average: number;
};

export const scores = pgTable("scores", {
  id: uuid("id").defaultRandom().primaryKey(),
  entryId: uuid("entry_id")
    .references(() => entries.id, { onDelete: "cascade" })
    .notNull(),
  stageId: uuid("stage_id")
    .references(() => stages.id)
    .notNull(),
  peerAvg: real("peer_avg"),
  expertAvg: real("expert_avg"),
  composite: real("composite"),
  rank: integer("rank"),
  criterionAverages: jsonb("criterion_averages")
    .$type<CriterionAverage[]>()
    .default([]),
  calculatedAt: timestamp("calculated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
