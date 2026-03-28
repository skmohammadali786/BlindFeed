import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db/schema";

const router = Router();

router.get("/notifications", async (req, res) => {
  const anonymousId = req.headers["x-anonymous-id"] as string | undefined;
  if (!anonymousId) return res.status(401).json({ error: "Missing identity" });

  try {
    const rows = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.recipientAnonymousId, anonymousId))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(50);

    return res.json(rows);
  } catch (err) {
    req.log.error(err, "Error fetching notifications");
    return res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

router.get("/notifications/unread-count", async (req, res) => {
  const anonymousId = req.headers["x-anonymous-id"] as string | undefined;
  if (!anonymousId) return res.json({ count: 0 });

  try {
    const rows = await db
      .select({ id: notificationsTable.id })
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.recipientAnonymousId, anonymousId),
          eq(notificationsTable.isRead, false)
        )
      );

    return res.json({ count: rows.length });
  } catch (err) {
    return res.json({ count: 0 });
  }
});

router.patch("/notifications/read-all", async (req, res) => {
  const anonymousId = req.headers["x-anonymous-id"] as string | undefined;
  if (!anonymousId) return res.status(401).json({ error: "Missing identity" });

  try {
    await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(
        and(
          eq(notificationsTable.recipientAnonymousId, anonymousId),
          eq(notificationsTable.isRead, false)
        )
      );
    return res.json({ ok: true });
  } catch (err) {
    req.log.error(err, "Error marking notifications read");
    return res.status(500).json({ error: "Failed to update" });
  }
});

router.patch("/notifications/:id/read", async (req, res) => {
  const anonymousId = req.headers["x-anonymous-id"] as string | undefined;
  if (!anonymousId) return res.status(401).json({ error: "Missing identity" });

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(
        and(
          eq(notificationsTable.id, id),
          eq(notificationsTable.recipientAnonymousId, anonymousId)
        )
      );
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "Failed to update" });
  }
});

export default router;
