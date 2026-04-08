import { Router } from "express";
import { eq, or } from "drizzle-orm";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { authLimiter } from "../middleware/rateLimits";
import { refreshAuthSession, supabaseAdminClient, supabaseAuthClient } from "../lib/supabase";
import { findOrLinkLocalUserBySupabaseIdentity } from "../lib/userIdentity";

const router = Router();

function generateAnonymousId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "anon_";
  for (let i = 0; i < 12; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

function getDbErrorCode(err: unknown): string | undefined {
  if (!err || typeof err !== "object") return undefined;
  const code = (err as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

function isEmailNotConfirmedError(err: { code?: string; message?: string } | null | undefined): boolean {
  const code = err?.code?.toLowerCase();
  if (code === "email_not_confirmed" || code === "email_not_confirmed_error") return true;
  return err?.message?.toLowerCase().includes("email not confirmed") ?? false;
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
    const nameNormalized = name.trim();
    const emailNormalized = email.trim().toLowerCase();
    const phoneNormalized = phone.trim();
    const existingByIdentity = await db
      .select({ email: usersTable.email, phone: usersTable.phone })
      .from(usersTable)
      .where(or(eq(usersTable.email, emailNormalized), eq(usersTable.phone, phoneNormalized)))
      // Email/phone are app-level unique checks (DB-level uniqueness is on anonymous_id and supabaseUserId).
      .limit(2);

    if (existingByIdentity.some((user) => user.email === emailNormalized)) {
      return res.status(409).json({ error: "An account with this email already exists. Please log in." });
    }
    if (existingByIdentity.some((user) => user.phone === phoneNormalized)) {
      return res.status(409).json({ error: "An account with this phone number already exists. Please log in." });
    }

    const anonymousId = typeof clientAnonId === "string" && clientAnonId.trim() ? clientAnonId.trim() : generateAnonymousId();
    const { data: signUpData, error: signUpError } = await supabaseAuthClient.auth.signUp({
      email: emailNormalized,
      password,
      options: {
        data: {
          anonymousId,
          name: nameNormalized,
          phone: phoneNormalized,
        },
      },
    });

    if (signUpError || !signUpData.user) {
      if (signUpError?.message?.toLowerCase().includes("already registered")) {
        return res.status(409).json({ error: "An account with this email already exists. Please log in." });
      }
      return res.status(400).json({ error: signUpError?.message ?? "Failed to register" });
    }

    let session = signUpData.session;
    if (!session) {
      const { data: signInData, error: signInError } = await supabaseAuthClient.auth.signInWithPassword({
        email: emailNormalized,
        password,
      });
      if (signInError || !signInData.session) {
        if (isEmailNotConfirmedError(signInError)) {
          return res.status(403).json({ error: "Email verification is required. Verify your email, then log in." });
        }
        return res.status(400).json({ error: signInError?.message ?? "Failed to create session after registration" });
      }
      session = signInData.session;
    }

    try {
      await db.insert(usersTable).values({
        supabaseUserId: signUpData.user.id,
        anonymousId,
        name: nameNormalized,
        email: emailNormalized,
        phone: phoneNormalized,
        passwordHash: null,
      });
    } catch (err) {
      req.log.error(err, "Failed to persist local user after Supabase sign-up");
      const deleteResult = await supabaseAdminClient.auth.admin.deleteUser(signUpData.user.id);
      if (deleteResult.error) {
        req.log.error(deleteResult.error, "Failed to rollback Supabase user after local registration failure");
        return res.status(500).json({
          error: "Registration entered a partial state. Please contact support before using this email again.",
        });
      }

      const code = getDbErrorCode(err);
      if (code === "23505") {
        return res.status(409).json({ error: "An account with this email or phone number may already exist. Please log in." });
      }
      return res.status(500).json({ error: "Failed to register" });
    }

    return res.status(201).json({
      anonymousId,
      alreadyRegistered: false,
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
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

    if (localUser.supabaseUserId && localUser.supabaseUserId !== signInData.user.id) {
      req.log.warn(
        { localSupabaseUserId: localUser.supabaseUserId, loginSupabaseUserId: signInData.user.id, userId: localUser.id },
        "Supabase identity mismatch during login",
      );
      return res.status(409).json({ error: "Account identity mismatch. Please contact support." });
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
