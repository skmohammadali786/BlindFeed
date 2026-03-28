import { Router } from "express";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@workspace/db";
import { commentsTable } from "@workspace/db/schema";

const router = Router();

router.get("/posts/:id/comments", async (req, res) => {
  const postId = parseInt(req.params.id);
  if (isNaN(postId)) return res.status(400).json({ error: "Invalid id" });

  try {
    const topLevel = await db
      .select()
      .from(commentsTable)
      .where(and(eq(commentsTable.postId, postId), isNull(commentsTable.parentId)))
      .orderBy(asc(commentsTable.createdAt));

    const replies = await db
      .select()
      .from(commentsTable)
      .where(and(eq(commentsTable.postId, postId)))
      .orderBy(asc(commentsTable.createdAt));

    const replyMap: Record<number, typeof replies> = {};
    for (const reply of replies) {
      if (reply.parentId !== null) {
        if (!replyMap[reply.parentId]) replyMap[reply.parentId] = [];
        replyMap[reply.parentId].push(reply);
      }
    }

    const withReplies = topLevel.map((c) => ({
      ...c,
      replies: replyMap[c.id] ?? [],
    }));

    return res.json(withReplies);
  } catch (err) {
    req.log.error(err, "Error fetching comments");
    return res.status(500).json({ error: "Failed to fetch comments" });
  }
});

router.post("/posts/:id/comments", async (req, res) => {
  const anonymousId = req.headers["x-anonymous-id"] as string;
  if (!anonymousId) return res.status(401).json({ error: "Unauthorized" });

  const postId = parseInt(req.params.id);
  if (isNaN(postId)) return res.status(400).json({ error: "Invalid id" });

  const { content, parentId } = req.body;
  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: "Content is required" });
  }

  try {
    const [comment] = await db
      .insert(commentsTable)
      .values({
        postId,
        anonymousId,
        content: content.trim(),
        parentId: parentId ?? null,
      })
      .returning();
    return res.status(201).json({ ...comment, replies: [] });
  } catch (err) {
    req.log.error(err, "Error creating comment");
    return res.status(500).json({ error: "Failed to create comment" });
  }
});

router.delete("/comments/:id", async (req, res) => {
  const anonymousId = req.headers["x-anonymous-id"] as string;
  if (!anonymousId) return res.status(401).json({ error: "Unauthorized" });

  const commentId = parseInt(req.params.id);
  if (isNaN(commentId)) return res.status(400).json({ error: "Invalid id" });

  try {
    const [comment] = await db
      .select()
      .from(commentsTable)
      .where(eq(commentsTable.id, commentId))
      .limit(1);
    if (!comment) return res.status(404).json({ error: "Not found" });
    if (comment.anonymousId !== anonymousId) return res.status(403).json({ error: "Forbidden" });
    await db.delete(commentsTable).where(eq(commentsTable.id, commentId));
    return res.json({ success: true });
  } catch (err) {
    req.log.error(err, "Error deleting comment");
    return res.status(500).json({ error: "Failed to delete comment" });
  }
});

export default router;
