import { Router } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db/schema";

const router = Router();

function getIdentities(req: { headers: Record<string, string | string[] | undefined> }): string[] {
  const primary = req.headers["x-anonymous-id"] as string | undefined;
  const perm = req.headers["x-perm-id"] as string | undefined;
  const ids: string[] = [];
  if (primary) ids.push(primary);
  if (perm && perm !== primary) ids.push(perm);
  return ids;
}

router.get("/notifications", async (req, res) => {
  const ids = getIdentities(req);
  if (ids.length === 0) return res.status(401).json({ error: "Missing identity" });

  try {
    const rows = await db
      .select()
      .from(notificationsTable)
      .where(ids.length === 1
        ? eq(notificationsTable.recipientAnonymousId, ids[0])
        : inArray(notificationsTable.recipientAnonymousId, ids)
      )
      .orderBy(desc(notificationsTable.createdAt))
      .limit(50);

    return res.json(rows);
  } catch (err) {
    req.log.error(err, "Error fetching notifications");
    return res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

router.get("/notifications/unread-count", async (req, res) => {
  const ids = getIdentities(req);
  if (ids.length === 0) return res.json({ count: 0 });

  try {
    const rows = await db
      .select({ id: notificationsTable.id })
      .from(notificationsTable)
      .where(
        and(
          ids.length === 1
            ? eq(notificationsTable.recipientAnonymousId, ids[0])
            : inArray(notificationsTable.recipientAnonymousId, ids),
          eq(notificationsTable.isRead, false)
        )
      );

    return res.json({ count: rows.length });
  } catch (err) {
    return res.json({ count: 0 });
  }
});

router.patch("/notifications/read-all", async (req, res) => {
  const ids = getIdentities(req);
  if (ids.length === 0) return res.status(401).json({ error: "Missing identity" });

  try {
    await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(
        and(
          ids.length === 1
            ? eq(notificationsTable.recipientAnonymousId, ids[0])
            : inArray(notificationsTable.recipientAnonymousId, ids),
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
  const ids = getIdentities(req);
  if (ids.length === 0) return res.status(401).json({ error: "Missing identity" });

  const idRaw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(idRaw, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(
        and(
          eq(notificationsTable.id, id),
          ids.length === 1
            ? eq(notificationsTable.recipientAnonymousId, ids[0])
            : inArray(notificationsTable.recipientAnonymousId, ids)
        )
      );
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "Failed to update" });
  }
});

export default router;
