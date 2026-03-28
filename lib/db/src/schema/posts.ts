import { boolean, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const postsTable = pgTable("posts", {
  id: serial("id").primaryKey(),
  anonymousId: text("anonymous_id").notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  videoUrl: text("video_url"),
  worthItCount: integer("worth_it_count").default(0).notNull(),
  skipCount: integer("skip_count").default(0).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isDraft: boolean("is_draft").default(false).notNull(),
  isSensitive: boolean("is_sensitive").default(false).notNull(),
  scheduledAt: timestamp("scheduled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
});

export const insertPostSchema = createInsertSchema(postsTable).omit({
  id: true,
  worthItCount: true,
  skipCount: true,
  createdAt: true,
});

export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof postsTable.$inferSelect;
