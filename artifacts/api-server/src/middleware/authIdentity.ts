import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { getAuthUserFromAccessToken } from "../lib/supabase";

export async function attachIdentityFromSupabaseToken(
  req: Parameters<import("express").RequestHandler>[0],
  res: Parameters<import("express").RequestHandler>[1],
  next: Parameters<import("express").RequestHandler>[2],
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    next();
    return;
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    next();
    return;
  }

  try {
    const authUser = await getAuthUserFromAccessToken(token);
    if (!authUser) {
      next();
      return;
    }

    const [user] = await db
      .select({
        anonymousId: usersTable.anonymousId,
      })
      .from(usersTable)
      .where(eq(usersTable.supabaseUserId, authUser.id))
      .limit(1);

    if (user?.anonymousId) {
      res.locals.authAnonymousId = user.anonymousId;
      req.headers["x-anonymous-id"] = user.anonymousId;
      req.headers["x-perm-id"] = user.anonymousId;
    }
  } catch {
    // no-op; route-level auth checks will handle unauthenticated requests
  }

  next();
}
