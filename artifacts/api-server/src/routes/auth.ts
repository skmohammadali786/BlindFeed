import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";

const router = Router();

router.post("/auth/register", async (req, res) => {
  const { anonymousId, name, email, phone } = req.body;
  if (!anonymousId || !name || !email || !phone) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const existing = await db
      .select({ anonymousId: usersTable.anonymousId })
      .from(usersTable)
      .where(eq(usersTable.anonymousId, anonymousId))
      .limit(1);

    if (existing.length > 0) {
      return res.json({ anonymousId, alreadyRegistered: true });
    }

    await db.insert(usersTable).values({ anonymousId, name, email, phone });
    return res.status(201).json({ anonymousId, alreadyRegistered: false });
  } catch (err) {
    req.log.error(err, "Error registering user");
    return res.status(500).json({ error: "Failed to register" });
  }
});

router.get("/auth/check/:anonymousId", async (req, res) => {
  const { anonymousId } = req.params;
  try {
    const existing = await db
      .select({ anonymousId: usersTable.anonymousId })
      .from(usersTable)
      .where(eq(usersTable.anonymousId, anonymousId))
      .limit(1);
    return res.json({ registered: existing.length > 0 });
  } catch (err) {
    req.log.error(err, "Error checking user");
    return res.status(500).json({ error: "Failed to check" });
  }
});

export default router;
