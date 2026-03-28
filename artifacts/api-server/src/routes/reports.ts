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

    await db.update(reportsTable).set({
      userResponse: response.trim(),
      appealStatus: "pending",
    }).where(eq(reportsTable.id, reportId));

    return res.json({ ok: true });
  } catch (err) {
    req.log.error(err, "Error submitting appeal");
    return res.status(500).json({ error: "Failed to submit appeal" });
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
        const violation = adminNote?.trim() || "It violated our community guidelines.";
        let actionMsg: string;
        if (action === "warn") {
          actionMsg = `⚠️ Content Warning: Your post received a moderation warning.\n\nReason: ${violation}\n\nIf you believe this was a mistake, you can submit an appeal below.`;
        } else {
          actionMsg = `🚫 Post Removed: Your post has been removed by our moderation team.\n\nReason: ${violation}\n\nIf you believe this was a mistake, you can submit an appeal to have your case reviewed.`;
        }

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

router.patch("/admin/appeals/:id", async (req, res) => {
  if (req.query.secret !== ADMIN_KEY && req.headers["x-admin-key"] !== ADMIN_KEY) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const reportId = parseInt(req.params.id, 10);
  if (isNaN(reportId)) return res.status(400).json({ error: "Invalid report id" });

  const { decision, response } = req.body;
  if (!decision || !["accepted", "rejected"].includes(decision)) {
    return res.status(400).json({ error: "decision must be 'accepted' or 'rejected'" });
  }

  try {
    const [report] = await db.select().from(reportsTable)
      .where(eq(reportsTable.id, reportId)).limit(1);
    if (!report) return res.status(404).json({ error: "Report not found" });

    await db.update(reportsTable).set({
      appealStatus: decision,
      appealResponse: response?.trim() || null,
    }).where(eq(reportsTable.id, reportId));

    const [post] = await db.select({ anonymousId: postsTable.anonymousId })
      .from(postsTable).where(eq(postsTable.id, report.postId)).limit(1);

    if (post) {
      const msg = decision === "accepted"
        ? `✅ Appeal Accepted: We've reviewed your appeal and decided in your favour. We apologize for any inconvenience caused.${response ? `\n\nNote: ${response.trim()}` : ""}`
        : `❌ Appeal Rejected: We've reviewed your appeal and upheld the original decision.\n\nReason: ${response?.trim() || "The content was confirmed to violate our community guidelines."}`;

      await db.insert(notificationsTable).values({
        recipientAnonymousId: post.anonymousId,
        type: "appeal_response",
        postId: report.postId,
        commentId: reportId,
        message: msg,
        isRead: false,
      }).catch(() => {});

      if (decision === "accepted") {
        const newExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000);
        await db.update(postsTable).set({ expiresAt: newExpiry }).where(eq(postsTable.id, report.postId)).catch(() => {});
      }
    }

    return res.json({ ok: true });
  } catch (err) {
    req.log.error(err, "Error responding to appeal");
    return res.status(500).json({ error: "Failed to respond to appeal" });
  }
});

export default router;
