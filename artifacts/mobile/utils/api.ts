import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEYS = {
  USER_ID: "bf_user_id",
  ANONYMOUS_ID: "bf_anonymous_id",
};

export const AUTH_STORAGE_KEYS = {
  ACCESS_TOKEN: "bf_access_token",
  REFRESH_TOKEN: "bf_refresh_token",
};

export class ApiError extends Error {
  status: number;
  retryAfterMs?: number;
  constructor(message: string, status: number, retryAfterMs?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

function getApiBase(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/api`;
  }
  return "http://localhost:8080/api";
}

async function getAnonymousId(): Promise<string | null> {
  const [anonymousId, legacyUserId] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEYS.ANONYMOUS_ID),
    AsyncStorage.getItem(STORAGE_KEYS.USER_ID),
  ]);
  return anonymousId ?? legacyUserId;
}

async function getPermanentId(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.ANONYMOUS_ID);
}

async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const base = getApiBase();
  const [anonymousId, permanentId, accessToken] = await Promise.all([
    getAnonymousId(),
    getPermanentId(),
    getAccessToken(),
  ]);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  } else {
    if (anonymousId) headers["x-anonymous-id"] = anonymousId;
    if (permanentId && permanentId !== anonymousId) headers["x-perm-id"] = permanentId;
  }

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
    let retryAfterMs: number | undefined;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
      if (data?.retryAfterMs) retryAfterMs = data.retryAfterMs;
    } catch {
    }
    const err = new ApiError(message, res.status, retryAfterMs);
    throw err;
  }

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};

export async function storeAuthTokens(tokens: { accessToken?: string | null; refreshToken?: string | null }) {
  if (tokens.accessToken) {
    await AsyncStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
  }
  if (tokens.refreshToken) {
    await AsyncStorage.setItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
  }
}

export interface ApiPost {
  id: number;
  anonymousId: string;
  content: string;
  imageUrl: string | null;
  videoUrl: string | null;
  worthItCount: number;
  skipCount: number;
  expiresAt: string;
  createdAt: string;
  myReaction: string | null;
  commentCount: number;
  isOwn: boolean;
  isSensitive: boolean;
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

export interface ApiNotification {
  id: number;
  recipientAnonymousId: string;
  type: "comment" | "reply" | "report_action";
  postId: number | null;
  commentId: number | null;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export async function requestUploadUrl(
  name: string,
  size: number,
  contentType: string,
): Promise<{ uploadURL: string; objectPath: string }> {
  const base = getApiBase();
  const [anonymousId, accessToken] = await Promise.all([getAnonymousId(), getAccessToken()]);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  } else if (anonymousId) {
    headers["x-anonymous-id"] = anonymousId;
  }

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
