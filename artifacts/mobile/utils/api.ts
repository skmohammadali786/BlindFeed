import AsyncStorage from "@react-native-async-storage/async-storage";

function getApiBase(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}/api-server/api`;
  return "http://localhost:3001/api";
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

  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `HTTP ${res.status}`);
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
  replies: ApiComment[];
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

  const res = await fetch(`${base}/storage/uploads/request-url`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name, size, contentType }),
  });
  if (!res.ok) throw new Error("Failed to get upload URL");
  return res.json();
}

export function getObjectUrl(objectPath: string): string {
  const base = getApiBase();
  return `${base}/storage${objectPath}`;
}
