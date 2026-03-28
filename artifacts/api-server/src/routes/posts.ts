import { Router } from "express";
import { and, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { postsTable, reactionsTable, commentsTable } from "@workspace/db/schema";

const router = Router();

const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;

router.get("/posts", async (req, res) => {
  const { sort = "fresh", limit = "20", offset = "0" } = req.query;
  const anonymousId = req.headers["x-anonymous-id"] as string;

  try {
    const now = new Date();
    let query = db
      .select({
        id: postsTable.id,
        anonymousId: postsTable.anonymousId,
        content: postsTable.content,
        imageUrl: postsTable.imageUrl,
        worthItCount: postsTable.worthItCount,
        skipCount: postsTable.skipCount,
        expiresAt: postsTable.expiresAt,
        createdAt: postsTable.createdAt,
      })
      .from(postsTable)
      .where(and(eq(postsTable.isDraft, false), gt(postsTable.expiresAt, now)))
      .$dynamic();

    if (sort === "top") {
      query = query.orderBy(desc(postsTable.worthItCount));
    } else {
      query = query.orderBy(desc(postsTable.createdAt));
    }

    const posts = await query
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    let userReactions: Record<number, string> = {};
    if (anonymousId) {
      const reactions = await db
        .select({ postId: reactionsTable.postId, type: reactionsTable.type })
        .from(reactionsTable)
        .where(eq(reactionsTable.anonymousId, anonymousId));
      userReactions = Object.fromEntries(reactions.map((r) => [r.postId, r.type]));
    }

    const commentCounts = await db
      .select({
        postId: commentsTable.postId,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(commentsTable)
      .groupBy(commentsTable.postId);
    const commentCountMap = Object.fromEntries(commentCounts.map((c) => [c.postId, c.count]));

    const enriched = posts.map((p) => ({
      ...p,
      myReaction: userReactions[p.id] ?? null,
      commentCount: commentCountMap[p.id] ?? 0,
      isOwn: p.anonymousId === anonymousId,
    }));

    return res.json(enriched);
  } catch (err) {
    req.log.error(err, "Error fetching posts");
    return res.status(500).json({ error: "Failed to fetch posts" });
  }
});

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 2;

router.post("/posts", async (req, res) => {
  const anonymousId = req.headers["x-anonymous-id"] as string;
  if (!anonymousId) return res.status(401).json({ error: "Unauthorized" });

  const { content, imageUrl, isDraft = false, expiresInHours } = req.body;
  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: "Content is required" });
  }

  if (!isDraft) {
    try {
      const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
      const recentPosts = await db
        .select({ id: postsTable.id, createdAt: postsTable.createdAt })
        .from(postsTable)
        .where(
          and(
            eq(postsTable.anonymousId, anonymousId),
            eq(postsTable.isDraft, false),
            gt(postsTable.createdAt, windowStart)
          )
        );

      if (recentPosts.length >= RATE_LIMIT_MAX) {
        const oldest = recentPosts.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
        const retryAfterMs = oldest.createdAt.getTime() + RATE_LIMIT_WINDOW_MS - Date.now();
        return res.status(429).json({
          error: "You can post 2 times per 15 minutes. Please wait.",
          retryAfterMs: Math.max(0, Math.ceil(retryAfterMs)),
        });
      }
    } catch (err) {
      req.log.error(err, "Error checking rate limit");
    }
  }

  let hours: number;
  if (expiresInHours === null) {
    hours = 100 * 365 * 24;
  } else if (typeof expiresInHours === "number" && expiresInHours >= 1 && expiresInHours <= 168) {
    hours = expiresInHours;
  } else {
    hours = 48;
  }
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

  try {
    const [post] = await db
      .insert(postsTable)
      .values({ anonymousId, content: content.trim(), imageUrl: imageUrl || null, expiresAt, isDraft })
      .returning();
    return res.status(201).json(post);
  } catch (err) {
    req.log.error(err, "Error creating post");
    return res.status(500).json({ error: "Failed to create post" });
  }
});

router.get("/posts/mine", async (req, res) => {
  const anonymousId = req.headers["x-anonymous-id"] as string;
  if (!anonymousId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const posts = await db
      .select()
      .from(postsTable)
      .where(and(eq(postsTable.anonymousId, anonymousId), eq(postsTable.isDraft, false)))
      .orderBy(desc(postsTable.createdAt));

    const postIds = posts.map((p) => p.id);
    let commentCountMap: Record<number, number> = {};
    let latestCommentMap: Record<number, { content: string; createdAt: Date }> = {};

    if (postIds.length > 0) {
      const commentCounts = await db
        .select({
          postId: commentsTable.postId,
          count: sql<number>`cast(count(*) as int)`,
        })
        .from(commentsTable)
        .where(inArray(commentsTable.postId, postIds))
        .groupBy(commentsTable.postId);
      commentCountMap = Object.fromEntries(commentCounts.map((c) => [c.postId, c.count]));

      const latestComments = await db
        .select()
        .from(commentsTable)
        .where(and(inArray(commentsTable.postId, postIds), isNull(commentsTable.parentId)))
        .orderBy(desc(commentsTable.createdAt));

      for (const c of latestComments) {
        if (!latestCommentMap[c.postId]) {
          latestCommentMap[c.postId] = { content: c.content, createdAt: c.createdAt };
        }
      }
    }

    const enriched = posts.map((p) => ({
      ...p,
      myReaction: null,
      commentCount: commentCountMap[p.id] ?? 0,
      isOwn: true,
      latestComment: latestCommentMap[p.id] ?? null,
    }));

    return res.json(enriched);
  } catch (err) {
    req.log.error(err, "Error fetching own posts");
    return res.status(500).json({ error: "Failed to fetch posts" });
  }
});

router.get("/posts/drafts", async (req, res) => {
  const anonymousId = req.headers["x-anonymous-id"] as string;
  if (!anonymousId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const drafts = await db
      .select()
      .from(postsTable)
      .where(and(eq(postsTable.anonymousId, anonymousId), eq(postsTable.isDraft, true)))
      .orderBy(desc(postsTable.createdAt));
    return res.json(drafts);
  } catch (err) {
    req.log.error(err, "Error fetching drafts");
    return res.status(500).json({ error: "Failed to fetch drafts" });
  }
});

router.get("/posts/:id", async (req, res) => {
  const anonymousId = req.headers["x-anonymous-id"] as string;
  const postId = parseInt(req.params.id);
  if (isNaN(postId)) return res.status(400).json({ error: "Invalid id" });

  try {
    const [post] = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
    if (!post) return res.status(404).json({ error: "Post not found" });

    let myReaction: string | null = null;
    if (anonymousId) {
      const [reaction] = await db
        .select({ type: reactionsTable.type })
        .from(reactionsTable)
        .where(and(eq(reactionsTable.postId, postId), eq(reactionsTable.anonymousId, anonymousId)))
        .limit(1);
      myReaction = reaction?.type ?? null;
    }

    const [{ count: commentCount }] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(commentsTable)
      .where(eq(commentsTable.postId, postId));

    return res.json({ ...post, myReaction, commentCount, isOwn: post.anonymousId === anonymousId });
  } catch (err) {
    req.log.error(err, "Error fetching post");
    return res.status(500).json({ error: "Failed to fetch post" });
  }
});

const EDIT_WINDOW_MS = 10 * 60 * 1000;

router.patch("/posts/:id", async (req, res) => {
  const anonymousId = req.headers["x-anonymous-id"] as string;
  if (!anonymousId) return res.status(401).json({ error: "Unauthorized" });

  const postId = parseInt(req.params.id);
  if (isNaN(postId)) return res.status(400).json({ error: "Invalid id" });

  try {
    const [post] = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
    if (!post) return res.status(404).json({ error: "Not found" });
    if (post.anonymousId !== anonymousId) return res.status(403).json({ error: "Forbidden" });

    const { content, imageUrl, isDraft } = req.body;

    if (!isDraft && post.isDraft === false) {
      const ageMs = Date.now() - new Date(post.createdAt).getTime();
      if (ageMs > EDIT_WINDOW_MS) {
        return res.status(403).json({ error: "Edit window expired. Posts can only be edited within 10 minutes of posting." });
      }
    }

    if (content !== undefined && content.trim().length === 0) {
      return res.status(400).json({ error: "Content cannot be empty" });
    }

    const [updated] = await db
      .update(postsTable)
      .set({
        ...(content !== undefined ? { content: content.trim() } : {}),
        ...(imageUrl !== undefined ? { imageUrl } : {}),
        ...(isDraft !== undefined ? { isDraft } : {}),
        updatedAt: new Date(),
      })
      .where(eq(postsTable.id, postId))
      .returning();
    return res.json(updated);
  } catch (err) {
    req.log.error(err, "Error updating post");
    return res.status(500).json({ error: "Failed to update post" });
  }
});

router.delete("/posts/:id", async (req, res) => {
  const anonymousId = req.headers["x-anonymous-id"] as string;
  if (!anonymousId) return res.status(401).json({ error: "Unauthorized" });

  const postId = parseInt(req.params.id);
  if (isNaN(postId)) return res.status(400).json({ error: "Invalid id" });

  try {
    const [post] = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
    if (!post) return res.status(404).json({ error: "Not found" });
    if (post.anonymousId !== anonymousId) return res.status(403).json({ error: "Forbidden" });
    await db.delete(postsTable).where(eq(postsTable.id, postId));
    return res.json({ success: true });
  } catch (err) {
    req.log.error(err, "Error deleting post");
    return res.status(500).json({ error: "Failed to delete post" });
  }
});

router.post("/posts/:id/react", async (req, res) => {
  const anonymousId = req.headers["x-anonymous-id"] as string;
  if (!anonymousId) return res.status(401).json({ error: "Unauthorized" });

  const postId = parseInt(req.params.id);
  if (isNaN(postId)) return res.status(400).json({ error: "Invalid id" });

  const { type } = req.body;
  if (!["worthit", "skip"].includes(type)) {
    return res.status(400).json({ error: "type must be worthit or skip" });
  }

  try {
    const [existing] = await db
      .select()
      .from(reactionsTable)
      .where(and(eq(reactionsTable.postId, postId), eq(reactionsTable.anonymousId, anonymousId)))
      .limit(1);

    const [post] = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
    if (!post) return res.status(404).json({ error: "Post not found" });

    if (existing) {
      if (existing.type === type) {
        await db.delete(reactionsTable).where(eq(reactionsTable.id, existing.id));
        const delta = type === "worthit" ? -1 : 0;
        const skipDelta = type === "skip" ? -1 : 0;
        const [updated] = await db
          .update(postsTable)
          .set({
            worthItCount: sql`${postsTable.worthItCount} + ${delta}`,
            skipCount: sql`${postsTable.skipCount} + ${skipDelta}`,
          })
          .where(eq(postsTable.id, postId))
          .returning();
        return res.json({ ...updated, myReaction: null });
      }
      await db.update(reactionsTable).set({ type }).where(eq(reactionsTable.id, existing.id));
      const worthDelta = type === "worthit" ? 1 : -1;
      const skipDelta = type === "skip" ? 1 : -1;
      const [updated] = await db
        .update(postsTable)
        .set({
          worthItCount: sql`${postsTable.worthItCount} + ${worthDelta}`,
          skipCount: sql`${postsTable.skipCount} + ${skipDelta}`,
        })
        .where(eq(postsTable.id, postId))
        .returning();
      return res.json({ ...updated, myReaction: type });
    }

    await db.insert(reactionsTable).values({ postId, anonymousId, type });
    const worthDelta = type === "worthit" ? 1 : 0;
    const skipDelta = type === "skip" ? 1 : 0;
    const [updated] = await db
      .update(postsTable)
      .set({
        worthItCount: sql`${postsTable.worthItCount} + ${worthDelta}`,
        skipCount: sql`${postsTable.skipCount} + ${skipDelta}`,
      })
      .where(eq(postsTable.id, postId))
      .returning();
    return res.json({ ...updated, myReaction: type });
  } catch (err) {
    req.log.error(err, "Error reacting to post");
    return res.status(500).json({ error: "Failed to react" });
  }
});

router.get("/users/:anonymousId/posts", async (req, res) => {
  const viewerAnonymousId = req.headers["x-anonymous-id"] as string;
  const { anonymousId } = req.params;

  try {
    const now = new Date();
    const posts = await db
      .select({
        id: postsTable.id,
        anonymousId: postsTable.anonymousId,
        content: postsTable.content,
        imageUrl: postsTable.imageUrl,
        worthItCount: postsTable.worthItCount,
        skipCount: postsTable.skipCount,
        expiresAt: postsTable.expiresAt,
        createdAt: postsTable.createdAt,
      })
      .from(postsTable)
      .where(
        and(
          eq(postsTable.anonymousId, anonymousId),
          eq(postsTable.isDraft, false),
          gt(postsTable.expiresAt, now),
        ),
      )
      .orderBy(desc(postsTable.createdAt))
      .limit(50);

    const commentCounts = await db
      .select({
        postId: commentsTable.postId,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(commentsTable)
      .groupBy(commentsTable.postId);
    const commentCountMap = Object.fromEntries(commentCounts.map((c) => [c.postId, c.count]));

    const enriched = posts.map((p) => ({
      ...p,
      myReaction: null,
      commentCount: commentCountMap[p.id] ?? 0,
      isOwn: p.anonymousId === viewerAnonymousId,
    }));

    return res.json(enriched);
  } catch (err) {
    req.log.error(err, "Error fetching user posts");
    return res.status(500).json({ error: "Failed to fetch user posts" });
  }
});

export default router;
