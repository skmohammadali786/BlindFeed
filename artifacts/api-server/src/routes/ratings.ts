import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { ratingsTable } from "@workspace/db/schema";
import { isAuthorizedAdmin } from "../middleware/adminAuth";
import { getAuthenticatedIdentity } from "../lib/requestIdentity";
import { parsePagination } from "../lib/pagination";

const router = Router();

router.post("/ratings", async (req, res) => {
  const anonymousId = getAuthenticatedIdentity(res);
  if (!anonymousId) return res.status(401).json({ error: "Unauthorized" });

  const { stars, category, feedback } = req.body;
  if (!stars || typeof stars !== "number" || stars < 1 || stars > 5) {
    return res.status(400).json({ error: "stars must be 1-5" });
  }

  try {
    const [rating] = await db
      .insert(ratingsTable)
      .values({
        anonymousId,
        stars,
        category: category?.trim() || null,
        feedback: feedback?.trim() || null,
      })
      .returning();
    return res.status(201).json(rating);
  } catch (err) {
    req.log.error(err, "Error saving rating");
    return res.status(500).json({ error: "Failed to save rating" });
  }
});

router.get("/admin/ratings", async (req, res) => {
  if (!isAuthorizedAdmin(req)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { limit: limitRaw = "50", offset: offsetRaw = "0" } = req.query;
  const { limit, offset } = parsePagination(limitRaw, offsetRaw);

  try {
    const ratings = await db
      .select()
      .from(ratingsTable)
      .orderBy(desc(ratingsTable.createdAt))
      .limit(limit)
      .offset(offset);

    const total = ratings.length;
    const avgStars =
      total > 0
        ? Math.round((ratings.reduce((s, r) => s + r.stars, 0) / total) * 10) / 10
        : 0;

    return res.json({ ratings, total, avgStars });
  } catch (err) {
    req.log.error(err, "Error fetching ratings");
    return res.status(500).json({ error: "Failed to fetch ratings" });
  }
});

export default router;
