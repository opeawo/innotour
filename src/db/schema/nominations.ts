import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { tournaments } from "./tournaments";
import { users } from "./users";

export const nominations = pgTable("nominations", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id, { onDelete: "cascade" })
    .notNull(),
  tournamentId: uuid("tournament_id")
    .references(() => tournaments.id, { onDelete: "cascade" })
    .notNull(),
  nominatorId: uuid("nominator_id")
    .references(() => users.id)
    .notNull(),
  nomineeName: varchar("nominee_name", { length: 255 }).notNull(),
  nomineeEmail: varchar("nominee_email", { length: 255 }).notNull(),
  nomineeUserId: uuid("nominee_user_id").references(() => users.id),
  converted: boolean("converted").notNull().default(false),
  inviteSentAt: timestamp("invite_sent_at", { withTimezone: true }),
  convertedAt: timestamp("converted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
