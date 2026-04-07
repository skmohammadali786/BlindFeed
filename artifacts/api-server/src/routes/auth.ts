import { Router } from "express";
import { eq, or } from "drizzle-orm";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { authLimiter } from "../middleware/rateLimits";
import { refreshAuthSession, supabaseAuthClient } from "../lib/supabase";
import { findOrLinkLocalUserBySupabaseIdentity } from "../lib/userIdentity";

const router = Router();

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
    const emailNormalized = email.trim().toLowerCase();
    const existingByEmail = await db
      .select({ anonymousId: usersTable.anonymousId })
      .from(usersTable)
      .where(eq(usersTable.email, emailNormalized))
      .limit(1);

    if (existingByEmail.length > 0) {
      return res.status(409).json({ error: "An account with this email already exists. Please log in." });
    }

    const anonymousId = clientAnonId ?? generateAnonymousId();
    const { data: signUpData, error: signUpError } = await supabaseAuthClient.auth.signUp({
      email: emailNormalized,
      password,
      options: {
        data: {
          anonymousId,
          name: name.trim(),
          phone: phone.trim(),
        },
      },
    });

    if (signUpError || !signUpData.user) {
      if (signUpError?.message?.toLowerCase().includes("already registered")) {
        return res.status(409).json({ error: "An account with this email already exists. Please log in." });
      }
      return res.status(400).json({ error: signUpError?.message ?? "Failed to register" });
    }

    await db.insert(usersTable).values({
      supabaseUserId: signUpData.user.id,
      anonymousId,
      name: name.trim(),
      email: emailNormalized,
      phone: phone.trim(),
      passwordHash: null,
    });

    return res.status(201).json({
      anonymousId,
      alreadyRegistered: false,
      accessToken: signUpData.session?.access_token ?? null,
      refreshToken: signUpData.session?.refresh_token ?? null,
    });
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

    const localUser = users[0];
    const { data: signInData, error: signInError } = await supabaseAuthClient.auth.signInWithPassword({
      email: localUser.email,
      password,
    });

    if (signInError || !signInData.user || !signInData.session) {
      return res.status(401).json({ error: signInError?.message ?? "Incorrect password" });
    }

    if (!localUser.supabaseUserId) {
      await db
        .update(usersTable)
        .set({ supabaseUserId: signInData.user.id })
        .where(eq(usersTable.id, localUser.id));
    }

    return res.json({
      anonymousId: localUser.anonymousId,
      name: localUser.name,
      accessToken: signInData.session.access_token,
      refreshToken: signInData.session.refresh_token,
    });
  } catch (err) {
    req.log.error(err, "Error logging in");
    return res.status(500).json({ error: "Failed to log in" });
  }
});

router.post("/auth/refresh", authLimiter, async (req, res) => {
  const { refreshToken } = req.body ?? {};
  if (!refreshToken || typeof refreshToken !== "string") {
    return res.status(400).json({ error: "refreshToken is required" });
  }

  try {
    const refreshed = await refreshAuthSession(refreshToken);
    if (!refreshed) {
      return res.status(401).json({ error: "Invalid or expired refresh token" });
    }

    const authUser = refreshed.user;
    const localUser = await findOrLinkLocalUserBySupabaseIdentity(authUser.id, authUser.email);

    if (!localUser) {
      return res.status(403).json({ error: "Account not linked. Please log in again." });
    }

    return res.json({
      anonymousId: localUser.anonymousId,
      name: localUser.name,
      accessToken: refreshed.session.access_token,
      refreshToken: refreshed.session.refresh_token,
    });
  } catch (err) {
    req.log.error(err, "Error refreshing session");
    return res.status(500).json({ error: "Failed to refresh session" });
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
