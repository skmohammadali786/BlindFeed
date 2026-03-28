import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const ratingsTable = pgTable("app_ratings", {
  id: serial("id").primaryKey(),
  anonymousId: text("anonymous_id").notNull(),
  stars: integer("stars").notNull(),
  category: text("category"),
  feedback: text("feedback"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Rating = typeof ratingsTable.$inferSelect;
