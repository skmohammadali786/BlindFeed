import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const reportsTable = pgTable("reports", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull(),
  reporterAnonymousId: text("reporter_anonymous_id").notNull(),
  reason: text("reason").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"),
  adminNote: text("admin_note"),
  userResponse: text("user_response"),
  appealStatus: text("appeal_status"),
  appealResponse: text("appeal_response"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});

export const insertReportSchema = createInsertSchema(reportsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reportsTable.$inferSelect;
