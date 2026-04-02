import { pgEnum } from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", [
  "super_admin",
  "organiser",
  "judge",
  "entrant",
  "spectator",
]);

export const tournamentStatus = pgEnum("tournament_status", [
  "draft",
  "live",
  "reviewing",
  "stage_1",
  "stage_2",
  "stage_3",
  "judging",
  "complete",
  "archived",
]);

export const stageType = pgEnum("stage_type", [
  "group",
  "semi_final",
  "final",
]);

export const stageStatus = pgEnum("stage_status", [
  "pending",
  "reviewing",
  "complete",
]);

export const entryStatus = pgEnum("entry_status", [
  "draft",
  "submitted",
  "advanced",
  "eliminated",
  "disqualified",
  "withdrawn",
  "winner",
]);

export const submissionType = pgEnum("submission_type", [
  "file_upload",
  "url",
  "supporting_documents",
]);

export const badgeType = pgEnum("badge_type", [
  "entered",
  "reviewer",
  "stage_1_achiever",
  "stage_2_achiever",
  "finalist",
  "winner",
]);
