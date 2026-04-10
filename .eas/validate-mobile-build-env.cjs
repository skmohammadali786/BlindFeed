const REQUIRED_API_ENV_KEYS = ["EXPO_PUBLIC_API_URL", "EXPO_PUBLIC_DOMAIN", "PUBLIC_DOMAIN"];
const MOBILE_PLATFORMS = new Set(["android", "ios"]);

function getConfiguredApiEnv() {
  for (const key of REQUIRED_API_ENV_KEYS) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return { key, value: value.trim() };
    }
  }
  return null;
}

function isPrivateIpv4Host(hostname) {
  const parts = hostname.split(".");
  if (parts.length !== 4) return false;
  const octets = parts.map((part) => Number(part));
  if (octets.some((octet) => Number.isNaN(octet) || !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return false;
  }
  const [first, second] = octets;
  if (first === 127 || first === 10) return true;
  if (first === 192 && second === 168) return true;
  return first === 172 && second >= 16 && second <= 31;
}

function isLocalOrPrivateHost(value) {
  try {
    const parsed = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    const host = parsed.hostname.toLowerCase();
    return host === "localhost" || isPrivateIpv4Host(host);
  } catch {
    return false;
  }
}

function main() {
  const platform = (process.env.EAS_BUILD_PLATFORM || "").toLowerCase();
  if (!MOBILE_PLATFORMS.has(platform)) return;

  const profile = (process.env.EAS_BUILD_PROFILE || "").toLowerCase();
  if (profile === "development") return;

  const configured = getConfiguredApiEnv();
  if (!configured) {
    console.error(
      `Missing API environment for ${platform} ${profile || "build"} profile. Set one of: ${REQUIRED_API_ENV_KEYS.join(", ")}.`,
    );
    process.exit(1);
  }

  if (isLocalOrPrivateHost(configured.value)) {
    console.error(
      `${configured.key} points to localhost/private network (${configured.value}). Use a public HTTPS API URL/domain for cloud ${platform} builds.`,
    );
    process.exit(1);
  }
}

main();
