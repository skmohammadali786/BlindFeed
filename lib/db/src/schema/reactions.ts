import { integer, pgTable, serial, text, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const reactionsTable = pgTable(
  "reactions",
  {
    id: serial("id").primaryKey(),
    postId: integer("post_id").notNull(),
    anonymousId: text("anonymous_id").notNull(),
    type: text("type").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [unique().on(t.postId, t.anonymousId)],
);

export const insertReactionSchema = createInsertSchema(reactionsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertReaction = z.infer<typeof insertReactionSchema>;
export type Reaction = typeof reactionsTable.$inferSelect;
