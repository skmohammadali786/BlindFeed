import { Router } from "express";
import { eq, or } from "drizzle-orm";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import crypto from "node:crypto";
import { authLimiter } from "../middleware/rateLimits";

const router = Router();

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function createHash(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = hashPassword(password, salt);
  return `${salt}:${hash}`;
}

function verifyHash(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const attempt = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(attempt, "hex"), Buffer.from(hash, "hex"));
}

function generateAnonymousId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "anon_";
  for (let i = 0; i < 12; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

router.post("/auth/register", authLimiter, async (req, res) => {
  const { anonymousId: clientAnonId, name, email, phone, password } = req.body;
  if (!name || !email || !phone || !password) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  try {
    const existingByEmail = await db
      .select({ anonymousId: usersTable.anonymousId })
      .from(usersTable)
      .where(eq(usersTable.email, email.trim().toLowerCase()))
      .limit(1);

    if (existingByEmail.length > 0) {
      return res.status(409).json({ error: "An account with this email already exists. Please log in." });
    }

    const anonymousId = clientAnonId ?? generateAnonymousId();
    const passwordHash = createHash(password);

    await db.insert(usersTable).values({
      anonymousId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      passwordHash,
    });

    return res.status(201).json({ anonymousId, alreadyRegistered: false });
  } catch (err) {
    req.log.error(err, "Error registering user");
    return res.status(500).json({ error: "Failed to register" });
  }
});

router.post("/auth/login", authLimiter, async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ error: "Missing credentials" });
  }

  try {
    const identifierClean = identifier.trim().toLowerCase();
    const users = await db
      .select()
      .from(usersTable)
      .where(or(eq(usersTable.email, identifierClean), eq(usersTable.phone, identifier.trim())))
      .limit(1);

    if (users.length === 0) {
      return res.status(401).json({ error: "No account found with that email or phone number" });
    }

    const user = users[0];
    if (!user.passwordHash) {
      return res.status(401).json({ error: "This account was created before password login was available. Please contact support." });
    }

    if (!verifyHash(password, user.passwordHash)) {
      return res.status(401).json({ error: "Incorrect password" });
    }

    return res.json({ anonymousId: user.anonymousId, name: user.name });
  } catch (err) {
    req.log.error(err, "Error logging in");
    return res.status(500).json({ error: "Failed to log in" });
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
