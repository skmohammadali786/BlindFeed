import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";

export interface LocalIdentityUser {
  id: number;
  anonymousId: string;
  name: string;
  email: string;
  supabaseUserId: string | null;
}

export async function findOrLinkLocalUserBySupabaseIdentity(
  supabaseUserId: string,
  email?: string | null,
): Promise<LocalIdentityUser | null> {
  const [userBySupabaseId] = await db
    .select({
      id: usersTable.id,
      anonymousId: usersTable.anonymousId,
      name: usersTable.name,
      email: usersTable.email,
      supabaseUserId: usersTable.supabaseUserId,
    })
    .from(usersTable)
    .where(eq(usersTable.supabaseUserId, supabaseUserId))
    .limit(1);

  if (userBySupabaseId) return userBySupabaseId;
  if (!email) return null;

  const [userByEmail] = await db
    .select({
      id: usersTable.id,
      anonymousId: usersTable.anonymousId,
      name: usersTable.name,
      email: usersTable.email,
      supabaseUserId: usersTable.supabaseUserId,
    })
    .from(usersTable)
    .where(eq(usersTable.email, email.trim().toLowerCase()))
    .limit(1);

  if (!userByEmail) return null;
  if (userByEmail.supabaseUserId && userByEmail.supabaseUserId !== supabaseUserId) return null;

  if (!userByEmail.supabaseUserId) {
    await db
      .update(usersTable)
      .set({ supabaseUserId })
      .where(eq(usersTable.id, userByEmail.id));
  }

  return { ...userByEmail, supabaseUserId };
}
