const REQUIRED_ENV_KEYS = [
  "DATABASE_URL",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_STORAGE_PRIVATE_BUCKET",
  "SUPABASE_STORAGE_PUBLIC_BUCKETS",
  "CORS_ALLOWED_ORIGINS",
  "ADMIN_KEY",
] as const;

export function validateRequiredEnv(): void {
  const missing = REQUIRED_ENV_KEYS.filter((key) => {
    const value = process.env[key];
    return !value || value.trim().length === 0;
  });

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}
