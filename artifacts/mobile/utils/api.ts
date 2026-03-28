import AsyncStorage from "@react-native-async-storage/async-storage";

function getApiBase(): string {
  // Explicit base URL injected at build time — most reliable across all environments.
  // Dev:  EXPO_PUBLIC_API_URL = https://<dev-domain>/api-server/api  (dev-proxy strips prefix)
  // Prod: EXPO_PUBLIC_API_URL = https://<prod-domain>/api            (Replit routes /api/* directly)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  // Web browser fallback (when no explicit URL is configured).
  if (typeof window !== "undefined" && window.location?.origin) {
    const isProduction = process.env.NODE_ENV === "production";
    return isProduction
      ? `${window.location.origin}/api`
      : `${window.location.origin}/api-server/api`;
  }
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}/api-server/api` : "http://localhost:8080/api";
}

async function getAnonymousId(): Promise<string | null> {
  return AsyncStorage.getItem("bf_anonymous_id");
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const base = getApiBase();
  const anonymousId = await getAnonymousId();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (anonymousId) headers["x-anonymous-id"] = anonymousId;

  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    throw new Error("No internet connection. Please try again.");
  }

  if (!res.ok) {
    let message = `Server error (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};

export interface ApiPost {
  id: number;
  anonymousId: string;
  content: string;
  imageUrl: string | null;
  worthItCount: number;
  skipCount: number;
  expiresAt: string;
  createdAt: string;
  myReaction: string | null;
  commentCount: number;
  isOwn: boolean;
}

export interface ApiComment {
  id: number;
  postId: number;
  anonymousId: string;
  content: string;
  parentId: number | null;
  createdAt: string;
  isOwn: boolean;
  replies: ApiComment[];
}

export interface ApiMyPost extends ApiPost {
  latestComment: { content: string; createdAt: string } | null;
}

export async function requestUploadUrl(
  name: string,
  size: number,
  contentType: string,
): Promise<{ uploadURL: string; objectPath: string }> {
  const base = getApiBase();
  const anonymousId = await getAnonymousId();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (anonymousId) headers["x-anonymous-id"] = anonymousId;

  let res: Response;
  try {
    res = await fetch(`${base}/storage/uploads/request-url`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name, size, contentType }),
    });
  } catch {
    throw new Error("No internet connection.");
  }
  if (!res.ok) throw new Error("Failed to get upload URL");
  return res.json();
}

export function getObjectUrl(objectPath: string): string {
  const base = getApiBase();
  return `${base}/storage${objectPath}`;
}
