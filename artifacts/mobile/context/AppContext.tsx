import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { api, ApiPost, ApiMyPost } from "@/utils/api";

export interface Post {
  id: string;
  content: string;
  imageUrl?: string | null;
  createdAt: number;
  expiresAt: number;
  worthItCount: number;
  skipCount: number;
  tempUserId: string;
  myReaction: string | null;
  commentCount: number;
  isOwn: boolean;
}

export interface AppSettings {
  contentFilter: boolean;
  dailyReminder: boolean;
  postPerformance: boolean;
  feedPreference: "all" | "text" | "images";
}

interface AppContextType {
  posts: Post[];
  tempUserId: string;
  anonymousId: string;
  registered: boolean;
  onboarded: boolean;
  appInitialized: boolean;
  settings: AppSettings;
  sessionSeconds: number;
  drafts: DraftPost[];
  feedLoading: boolean;
  feedError: string | null;
  setOnboarded: () => void;
  setRegistered: (id: string) => void;
  logout: () => Promise<void>;
  addPost: (content: string, imageUrl?: string | null, isDraft?: boolean, expiresInHours?: number | null) => Promise<Post | null>;
  fetchMyPosts: () => Promise<ApiMyPost[]>;
  publishDraft: (draftId: string) => Promise<void>;
  deleteDraft: (draftId: string) => void;
  reactToPost: (postId: string, type: "worthit" | "skip") => Promise<void>;
  refreshFeed: (sort?: "fresh" | "top") => Promise<void>;
  getActivePosts: (sort?: "fresh" | "top") => Post[];
  getMyPosts: () => Post[];
  updateSetting: (key: keyof AppSettings, value: boolean | string) => void;
  resetUserId: () => Promise<void>;
  clearAllData: () => Promise<void>;
}

export interface DraftPost {
  id: string;
  content: string;
  imageUrl?: string | null;
  createdAt: number;
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEYS = {
  USER_ID: "bf_user_id",
  USER_CREATED: "bf_user_created",
  ONBOARDED: "bf_onboarded",
  SETTINGS: "bf_settings",
  ANONYMOUS_ID: "bf_anonymous_id",
  REGISTERED: "bf_registered",
  DRAFTS: "bf_drafts",
};

const USER_RESET_MS = 7 * 24 * 60 * 60 * 1000;

const DEFAULT_SETTINGS: AppSettings = {
  contentFilter: true,
  dailyReminder: true,
  postPerformance: false,
  feedPreference: "all",
};

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

function generateUserId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let suffix = "";
  for (let i = 0; i < 8; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `anon_${suffix}`;
}

function mapApiPost(p: ApiPost): Post {
  return {
    id: String(p.id),
    content: p.content,
    imageUrl: p.imageUrl,
    createdAt: new Date(p.createdAt).getTime(),
    expiresAt: new Date(p.expiresAt).getTime(),
    worthItCount: p.worthItCount,
    skipCount: p.skipCount,
    tempUserId: p.anonymousId,
    myReaction: p.myReaction,
    commentCount: p.commentCount,
    isOwn: p.isOwn,
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [sortMode, setSortMode] = useState<"fresh" | "top">("fresh");
  const [tempUserId, setTempUserId] = useState<string>("User0000");
  const [anonymousId, setAnonymousId] = useState<string>("");
  const [registered, setRegisteredState] = useState<boolean>(false);
  const [onboarded, setOnboardedState] = useState<boolean>(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [drafts, setDrafts] = useState<DraftPost[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const sessionStart = useRef(Date.now());

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      setSessionSeconds(Math.floor((Date.now() - sessionStart.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [onboardedRaw, settingsRaw, userIdRaw, userCreatedRaw, anonIdRaw, registeredRaw, draftsRaw] =
        await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.ONBOARDED),
          AsyncStorage.getItem(STORAGE_KEYS.SETTINGS),
          AsyncStorage.getItem(STORAGE_KEYS.USER_ID),
          AsyncStorage.getItem(STORAGE_KEYS.USER_CREATED),
          AsyncStorage.getItem(STORAGE_KEYS.ANONYMOUS_ID),
          AsyncStorage.getItem(STORAGE_KEYS.REGISTERED),
          AsyncStorage.getItem(STORAGE_KEYS.DRAFTS),
        ]);

      setOnboardedState(onboardedRaw === "true");
      const isReg = registeredRaw === "true";
      setRegisteredState(isReg);

      if (settingsRaw) {
        try { setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(settingsRaw) }); } catch (_) {}
      }

      let userId = userIdRaw;
      const userCreated = userCreatedRaw ? parseInt(userCreatedRaw) : null;
      if (!userId || !userCreated || Date.now() - userCreated > USER_RESET_MS) {
        userId = generateUserId();
        await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, userId);
        await AsyncStorage.setItem(STORAGE_KEYS.USER_CREATED, Date.now().toString());
      }
      setTempUserId(userId);

      if (anonIdRaw) {
        setAnonymousId(anonIdRaw);
      }

      if (draftsRaw) {
        try { setDrafts(JSON.parse(draftsRaw)); } catch (_) {}
      }
    } catch (_) {}
    setLoaded(true);
  };

  const refreshFeed = useCallback(async (sort: "fresh" | "top" = "fresh") => {
    setSortMode(sort);
    setFeedLoading(true);
    setFeedError(null);
    try {
      const data = await api.get<ApiPost[]>(`/posts?sort=${sort}`);
      setPosts(data.map(mapApiPost));
    } catch (err: unknown) {
      setFeedError(err instanceof Error ? err.message : "Failed to load posts");
    } finally {
      setFeedLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loaded) refreshFeed("fresh");
  }, [loaded, refreshFeed]);

  const setOnboarded = useCallback(async () => {
    setOnboardedState(true);
    await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDED, "true");
  }, []);

  const setRegistered = useCallback(async (anonId: string) => {
    setRegisteredState(true);
    setAnonymousId(anonId);
    await AsyncStorage.setItem(STORAGE_KEYS.REGISTERED, "true");
    await AsyncStorage.setItem(STORAGE_KEYS.ANONYMOUS_ID, anonId);
  }, []);

  const logout = useCallback(async () => {
    setRegisteredState(false);
    setAnonymousId("");
    await AsyncStorage.multiRemove([STORAGE_KEYS.ANONYMOUS_ID, STORAGE_KEYS.REGISTERED]);
  }, []);

  const addPost = useCallback(async (content: string, imageUrl?: string | null, isDraft?: boolean, expiresInHours?: number | null): Promise<Post | null> => {
    if (isDraft) {
      const draft: DraftPost = {
        id: generateId(),
        content,
        imageUrl: imageUrl ?? null,
        createdAt: Date.now(),
      };
      setDrafts((prev) => {
        const updated = [draft, ...prev];
        AsyncStorage.setItem(STORAGE_KEYS.DRAFTS, JSON.stringify(updated));
        return updated;
      });
      return null;
    }

    try {
      const apiPost = await api.post<ApiPost>("/posts", {
        content,
        imageUrl: imageUrl ?? null,
        expiresInHours: expiresInHours === undefined ? 48 : expiresInHours,
      });
      const newPost = mapApiPost(apiPost);
      setPosts((prev) => [newPost, ...prev]);
      return newPost;
    } catch (err) {
      throw err;
    }
  }, []);

  const fetchMyPosts = useCallback(async (): Promise<ApiMyPost[]> => {
    return api.get<ApiMyPost[]>("/posts/mine");
  }, []);

  const publishDraft = useCallback(async (draftId: string) => {
    const draft = drafts.find((d) => d.id === draftId);
    if (!draft) return;
    await addPost(draft.content, draft.imageUrl);
    setDrafts((prev) => {
      const updated = prev.filter((d) => d.id !== draftId);
      AsyncStorage.setItem(STORAGE_KEYS.DRAFTS, JSON.stringify(updated));
      return updated;
    });
  }, [drafts, addPost]);

  const deleteDraft = useCallback((draftId: string) => {
    setDrafts((prev) => {
      const updated = prev.filter((d) => d.id !== draftId);
      AsyncStorage.setItem(STORAGE_KEYS.DRAFTS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const reactToPost = useCallback(async (postId: string, type: "worthit" | "skip") => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const wasReacted = p.myReaction === type;
        return {
          ...p,
          myReaction: wasReacted ? null : type,
          worthItCount: type === "worthit"
            ? p.worthItCount + (wasReacted ? -1 : 1)
            : p.worthItCount + (p.myReaction === "worthit" ? -1 : 0),
          skipCount: type === "skip"
            ? p.skipCount + (wasReacted ? -1 : 1)
            : p.skipCount + (p.myReaction === "skip" ? -1 : 0),
        };
      })
    );
    try {
      const updated = await api.post<ApiPost>(`/posts/${postId}/react`, { type });
      setPosts((prev) => prev.map((p) => (p.id === postId ? mapApiPost(updated) : p)));
    } catch (_) {
      await refreshFeed(sortMode);
    }
  }, [refreshFeed, sortMode]);

  const getActivePosts = useCallback(
    (sort: "fresh" | "top" = "fresh") => {
      const now = Date.now();
      let active = posts.filter((p) => p.expiresAt > now);

      if (settings.feedPreference === "text") {
        active = active.filter((p) => !p.imageUrl);
      } else if (settings.feedPreference === "images") {
        active = active.filter((p) => !!p.imageUrl);
      }

      if (settings.contentFilter) {
        active = active.filter((p) => {
          const lower = p.content.toLowerCase();
          const blocked = ["nsfw", "explicit", "18+", "adult content"];
          return !blocked.some((term) => lower.includes(term));
        });
      }

      if (sort === "top") {
        return [...active].sort((a, b) => b.worthItCount - a.worthItCount);
      }
      return active;
    },
    [posts, settings.feedPreference, settings.contentFilter]
  );

  const getMyPosts = useCallback(() => {
    return posts.filter((p) => p.isOwn);
  }, [posts]);

  const updateSetting = useCallback(async (key: keyof AppSettings, value: boolean | string) => {
    setSettings((prev) => {
      const updated = { ...prev, [key]: value };
      AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const resetUserId = useCallback(async () => {
    const newId = generateUserId();
    setTempUserId(newId);
    await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, newId);
    await AsyncStorage.setItem(STORAGE_KEYS.USER_CREATED, Date.now().toString());
  }, []);

  const clearAllData = useCallback(async () => {
    await AsyncStorage.multiRemove([STORAGE_KEYS.SETTINGS, STORAGE_KEYS.DRAFTS]);
    setDrafts([]);
    setSettings(DEFAULT_SETTINGS);
    await refreshFeed("fresh");
  }, [refreshFeed]);

  return (
    <AppContext.Provider
      value={{
        posts,
        tempUserId,
        anonymousId,
        registered,
        onboarded,
        appInitialized: loaded,
        settings,
        sessionSeconds,
        drafts,
        feedLoading,
        feedError,
        setOnboarded,
        setRegistered,
        logout,
        addPost,
        fetchMyPosts,
        publishDraft,
        deleteDraft,
        reactToPost,
        refreshFeed,
        getActivePosts,
        getMyPosts,
        updateSetting,
        resetUserId,
        clearAllData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
