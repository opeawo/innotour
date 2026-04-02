import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { users } from "./users";
import { tournamentStatus, submissionType } from "./enums";

export const tournaments = pgTable("tournaments", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id, { onDelete: "cascade" })
    .notNull(),
  organiserId: uuid("organiser_id")
    .references(() => users.id)
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull(),
  description: text("description"),
  status: tournamentStatus("status").notNull().default("draft"),
  submissionType: submissionType("submission_type").notNull(),
  targetEntries: integer("target_entries"),
  finalSize: integer("final_size").notNull().default(3),
  submissionDeadline: timestamp("submission_deadline", { withTimezone: true }),
  prizeDescription: text("prize_description"),
  logoUrl: text("logo_url"),
  bannerUrl: text("banner_url"),
  primaryColor: varchar("primary_color", { length: 7 }).default("#4F46E5"),
  termsAndConditions: text("terms_and_conditions"),
  enableJudgePanel: boolean("enable_judge_panel").notNull().default(false),
  enablePublicGallery: boolean("enable_public_gallery").notNull().default(false),
  enableLeaderboard: boolean("enable_leaderboard").notNull().default(false),
  enablePublicNames: boolean("enable_public_names").notNull().default(false),
  isInviteOnly: boolean("is_invite_only").notNull().default(false),
  accessCode: varchar("access_code", { length: 50 }),
  settings: jsonb("settings").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
