import { createClient } from "@supabase/supabase-js";
import { logger } from "./logger";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  throw new Error("SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY must be set");
}

export const supabaseAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const supabaseAdminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export async function getAuthUserFromAccessToken(accessToken: string) {
  const { data, error } = await supabaseAuthClient.auth.getUser(accessToken);
  if (error || !data.user) {
    if (error) logger.warn({ err: error }, "Supabase token validation failed");
    return null;
  }
  return data.user;
}

export async function refreshAuthSession(refreshToken: string) {
  const { data, error } = await supabaseAuthClient.auth.refreshSession({
    refresh_token: refreshToken,
  });
  if (error || !data.session || !data.user) {
    if (error) logger.warn({ err: error }, "Supabase token refresh failed");
    return null;
  }
  return data;
}
