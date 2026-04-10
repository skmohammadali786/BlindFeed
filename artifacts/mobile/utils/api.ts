import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const STORAGE_KEYS = {
  USER_ID: "bf_user_id",
  ANONYMOUS_ID: "bf_anonymous_id",
};

export const AUTH_STORAGE_KEYS = {
  ACCESS_TOKEN: "bf_access_token",
  REFRESH_TOKEN: "bf_refresh_token",
};

interface RefreshAuthResponse {
  accessToken?: string | null;
  refreshToken?: string | null;
}

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
  const stripTrailingSlash = (value: string): string => value.replace(/\/+$/, "");
  const normalizeDomainToApi = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) return "";
    const isLocalHost =
      /^localhost(?::\d+)?$/i.test(trimmed) ||
      /^127(?:\.\d{1,3}){3}(?::\d+)?$/.test(trimmed) ||
      /^10(?:\.\d{1,3}){3}(?::\d+)?$/.test(trimmed) ||
      /^192\.168(?:\.\d{1,3}){2}(?::\d+)?$/.test(trimmed) ||
      /^172\.(1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}(?::\d+)?$/.test(trimmed);
    const defaultProtocol = isLocalHost ? "http://" : "https://";
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `${defaultProtocol}${trimmed}`;
    return `${stripTrailingSlash(withProtocol)}/api`;
  };

  if (process.env.EXPO_PUBLIC_API_URL) {
    return stripTrailingSlash(process.env.EXPO_PUBLIC_API_URL);
  }
  if (process.env.EXPO_PUBLIC_DOMAIN) {
    const apiUrl = normalizeDomainToApi(process.env.EXPO_PUBLIC_DOMAIN);
    if (apiUrl) return apiUrl;
  }
  if (process.env.PUBLIC_DOMAIN) {
    const apiUrl = normalizeDomainToApi(process.env.PUBLIC_DOMAIN);
    if (apiUrl) return apiUrl;
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/api`;
  }
  if (Platform.OS === "android") {
    return "http://10.0.2.2:8080/api";
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

async function getRefreshToken(): Promise<string | null> {
  return AsyncStorage.getItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN);
}

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return null;

    try {
      const res = await fetch(`${getApiBase()}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        await storeAuthTokens({ accessToken: null, refreshToken: null });
        return null;
      }

      const data = (await res.json()) as RefreshAuthResponse;
      await storeAuthTokens(data);
      return data.accessToken ?? null;
    } catch {
      return null;
    }
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  allowRefreshRetry: boolean = true,
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

  if (res.status === 401 && accessToken && allowRefreshRetry) {
    const refreshedAccessToken = await refreshAccessToken();
    if (refreshedAccessToken) {
      return request<T>(method, path, body, false);
    }
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
  if (tokens.accessToken === null) {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
  } else if (tokens.accessToken) {
    await AsyncStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
  }
  if (tokens.refreshToken === null) {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN);
  } else if (tokens.refreshToken) {
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
  return api.post<{ uploadURL: string; objectPath: string }>("/storage/uploads/request-url", {
    name,
    size,
    contentType,
  });
}

export function getObjectUrl(objectPath: string): string {
  const base = getApiBase();
  return `${base}/storage${objectPath}`;
}
