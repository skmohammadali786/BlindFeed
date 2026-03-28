import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { reportsTable, postsTable, notificationsTable } from "@workspace/db/schema";
import { reportLimiter } from "../middleware/rateLimits";

const router = Router();
const ADMIN_KEY = process.env.ADMIN_KEY ?? "blindfeed-admin-2026";

router.post("/posts/:id/report", reportLimiter, async (req, res) => {
  const anonymousId = req.headers["x-anonymous-id"] as string | undefined;
  if (!anonymousId) return res.status(401).json({ error: "Unauthorized" });

  const postId = parseInt(req.params.id, 10);
  if (isNaN(postId)) return res.status(400).json({ error: "Invalid post id" });

  const { reason, description } = req.body;
  if (!reason) return res.status(400).json({ error: "Reason is required" });

  try {
    const [post] = await db.select({ id: postsTable.id, anonymousId: postsTable.anonymousId })
      .from(postsTable).where(eq(postsTable.id, postId)).limit(1);

    if (!post) return res.status(404).json({ error: "Post not found" });
    if (post.anonymousId === anonymousId) {
      return res.status(400).json({ error: "You cannot report your own post" });
    }

    const existing = await db.select({ id: reportsTable.id }).from(reportsTable)
      .where(and(eq(reportsTable.postId, postId), eq(reportsTable.reporterAnonymousId, anonymousId))).limit(1);
    if (existing.length > 0) {
      return res.status(409).json({ error: "You have already reported this post" });
    }

    await db.insert(reportsTable).values({
      postId,
      reporterAnonymousId: anonymousId,
      reason,
      description: description?.trim() || null,
      status: "pending",
    });

    return res.status(201).json({ ok: true });
  } catch (err) {
    req.log.error(err, "Error creating report");
    return res.status(500).json({ error: "Failed to submit report" });
  }
});

router.post("/reports/:id/respond", async (req, res) => {
  const anonymousId = req.headers["x-anonymous-id"] as string | undefined;
  if (!anonymousId) return res.status(401).json({ error: "Unauthorized" });

  const reportId = parseInt(req.params.id, 10);
  if (isNaN(reportId)) return res.status(400).json({ error: "Invalid report id" });

  const { response } = req.body;
  if (!response || response.trim().length < 5) {
    return res.status(400).json({ error: "Response must be at least 5 characters" });
  }

  try {
    const [report] = await db.select().from(reportsTable)
      .where(eq(reportsTable.id, reportId)).limit(1);

    if (!report) return res.status(404).json({ error: "Report not found" });

    const [post] = await db.select({ anonymousId: postsTable.anonymousId }).from(postsTable)
      .where(eq(postsTable.id, report.postId)).limit(1);

    if (!post || post.anonymousId !== anonymousId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await db.update(reportsTable).set({ userResponse: response.trim() })
      .where(eq(reportsTable.id, reportId));

    return res.json({ ok: true });
  } catch (err) {
    req.log.error(err, "Error submitting report response");
    return res.status(500).json({ error: "Failed to submit response" });
  }
});

router.get("/admin/reports", async (req, res) => {
  if (req.query.secret !== ADMIN_KEY && req.headers["x-admin-key"] !== ADMIN_KEY) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { status, limit = "50", offset = "0" } = req.query;

  try {
    let query = db.select().from(reportsTable).$dynamic();
    if (status && typeof status === "string") {
      query = query.where(eq(reportsTable.status, status));
    }
    const reports = await query
      .orderBy(desc(reportsTable.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    const enriched = await Promise.all(reports.map(async (r) => {
      const [post] = await db.select({ content: postsTable.content, anonymousId: postsTable.anonymousId })
        .from(postsTable).where(eq(postsTable.id, r.postId)).limit(1);
      return { ...r, postContent: post?.content ?? null, postAuthorId: post?.anonymousId ?? null };
    }));

    return res.json(enriched);
  } catch (err) {
    req.log.error(err, "Error fetching reports");
    return res.status(500).json({ error: "Failed to fetch reports" });
  }
});

router.patch("/admin/reports/:id", async (req, res) => {
  if (req.query.secret !== ADMIN_KEY && req.headers["x-admin-key"] !== ADMIN_KEY) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const reportId = parseInt(req.params.id, 10);
  if (isNaN(reportId)) return res.status(400).json({ error: "Invalid report id" });

  const { action, adminNote } = req.body;
  if (!action || !["dismiss", "warn", "remove"].includes(action)) {
    return res.status(400).json({ error: "action must be dismiss, warn, or remove" });
  }

  try {
    const [report] = await db.select().from(reportsTable)
      .where(eq(reportsTable.id, reportId)).limit(1);
    if (!report) return res.status(404).json({ error: "Report not found" });

    const newStatus = action === "dismiss" ? "dismissed" : "actioned";
    await db.update(reportsTable).set({
      status: newStatus,
      adminNote: adminNote?.trim() || null,
      resolvedAt: new Date(),
    }).where(eq(reportsTable.id, reportId));

    if (action !== "dismiss") {
      const [post] = await db.select({ anonymousId: postsTable.anonymousId })
        .from(postsTable).where(eq(postsTable.id, report.postId)).limit(1);

      if (post) {
        const actionMsg = action === "warn"
          ? `Your post was reviewed and received a warning: "${adminNote || "Please follow community guidelines."}". You can respond if this was a mistake.`
          : `Your post was reviewed and has been removed: "${adminNote || "It violated community guidelines."}". You can respond if this was a mistake.`;

        await db.insert(notificationsTable).values({
          recipientAnonymousId: post.anonymousId,
          type: "report_action",
          postId: report.postId,
          commentId: reportId,
          message: actionMsg,
          isRead: false,
        }).catch(() => {});

        if (action === "remove") {
          await db.update(postsTable).set({ expiresAt: new Date() }).where(eq(postsTable.id, report.postId)).catch(() => {});
        }
      }
    }

    return res.json({ ok: true });
  } catch (err) {
    req.log.error(err, "Error actioning report");
    return res.status(500).json({ error: "Failed to action report" });
  }
});

export default router;
