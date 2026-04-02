import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { userRole } from "./enums";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id, {
    onDelete: "cascade",
  }),
  clerkId: varchar("clerk_id", { length: 255 }).notNull().unique(),
  role: userRole("role").notNull().default("entrant"),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  avatarUrl: text("avatar_url"),
  organisation: varchar("organisation", { length: 255 }),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
