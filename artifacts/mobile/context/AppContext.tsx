import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export interface Post {
  id: string;
  content: string;
  createdAt: number;
  expiresAt: number;
  worthItCount: number;
  skipCount: number;
  tempUserId: string;
}

interface AppContextType {
  posts: Post[];
  reactions: Record<string, "worthit" | "skip">;
  tempUserId: string;
  onboarded: boolean;
  setOnboarded: () => void;
  addPost: (content: string) => void;
  reactToPost: (postId: string, type: "worthit" | "skip") => void;
  getActivePosts: (sort?: "fresh" | "top") => Post[];
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEYS = {
  POSTS: "bf_posts",
  REACTIONS: "bf_reactions",
  USER_ID: "bf_user_id",
  USER_CREATED: "bf_user_created",
  ONBOARDED: "bf_onboarded",
};

const POST_EXPIRY_MS = 48 * 60 * 60 * 1000;
const USER_RESET_MS = 7 * 24 * 60 * 60 * 1000;

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

function generateUserId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "#";
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

const SEED_POSTS: Omit<Post, "id" | "expiresAt" | "tempUserId">[] = [
  {
    content:
      "Just finished a 10-mile run. The silence at 5 AM hits different when nobody knows who you are.",
    createdAt: Date.now() - 1000 * 60 * 120,
    worthItCount: 47,
    skipCount: 3,
  },
  {
    content:
      "Unpopular opinion: Most productivity advice is just procrastination in disguise.",
    createdAt: Date.now() - 1000 * 60 * 240,
    worthItCount: 128,
    skipCount: 12,
  },
  {
    content:
      "Been learning to cook without following recipes. Failed spectacularly tonight but it was fun.",
    createdAt: Date.now() - 1000 * 60 * 360,
    worthItCount: 89,
    skipCount: 6,
  },
  {
    content:
      "The best ideas don't need a face behind them. They just need to be heard.",
    createdAt: Date.now() - 1000 * 60 * 480,
    worthItCount: 212,
    skipCount: 18,
  },
  {
    content:
      "We spend more time curating our online identity than actually living. What if we just... stopped?",
    createdAt: Date.now() - 1000 * 60 * 600,
    worthItCount: 67,
    skipCount: 11,
  },
  {
    content:
      "Silence is underrated. Not every moment needs to be documented, shared, and validated.",
    createdAt: Date.now() - 1000 * 60 * 720,
    worthItCount: 38,
    skipCount: 7,
  },
  {
    content:
      "Hot take: most 'thought leaders' are just people who got lucky and learned to talk confidently about it.",
    createdAt: Date.now() - 1000 * 60 * 900,
    worthItCount: 102,
    skipCount: 44,
  },
];

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [reactions, setReactions] = useState<Record<string, "worthit" | "skip">>({});
  const [tempUserId, setTempUserId] = useState<string>("#------");
  const [onboarded, setOnboardedState] = useState<boolean>(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [postsRaw, reactionsRaw, userIdRaw, userCreatedRaw, onboardedRaw] =
        await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.POSTS),
          AsyncStorage.getItem(STORAGE_KEYS.REACTIONS),
          AsyncStorage.getItem(STORAGE_KEYS.USER_ID),
          AsyncStorage.getItem(STORAGE_KEYS.USER_CREATED),
          AsyncStorage.getItem(STORAGE_KEYS.ONBOARDED),
        ]);

      setOnboardedState(onboardedRaw === "true");

      let userId = userIdRaw;
      const userCreated = userCreatedRaw ? parseInt(userCreatedRaw) : null;
      if (!userId || !userCreated || Date.now() - userCreated > USER_RESET_MS) {
        userId = generateUserId();
        await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, userId);
        await AsyncStorage.setItem(STORAGE_KEYS.USER_CREATED, Date.now().toString());
      }
      setTempUserId(userId);

      const parsedReactions = reactionsRaw ? JSON.parse(reactionsRaw) : {};
      setReactions(parsedReactions);

      let parsedPosts: Post[] = postsRaw ? JSON.parse(postsRaw) : [];
      const now = Date.now();
      parsedPosts = parsedPosts.filter((p) => p.expiresAt > now);

      if (parsedPosts.length === 0) {
        parsedPosts = SEED_POSTS.map((seed) => ({
          ...seed,
          id: generateId(),
          expiresAt: seed.createdAt + POST_EXPIRY_MS,
          tempUserId: generateUserId(),
        }));
        await AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(parsedPosts));
      }

      parsedPosts.sort((a, b) => b.createdAt - a.createdAt);
      setPosts(parsedPosts);
    } catch (_) {}
    setLoaded(true);
  };

  const setOnboarded = useCallback(async () => {
    setOnboardedState(true);
    await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDED, "true");
  }, []);

  const addPost = useCallback(
    (content: string) => {
      const newPost: Post = {
        id: generateId(),
        content,
        createdAt: Date.now(),
        expiresAt: Date.now() + POST_EXPIRY_MS,
        worthItCount: 0,
        skipCount: 0,
        tempUserId,
      };
      setPosts((prev) => {
        const updated = [newPost, ...prev];
        AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updated));
        return updated;
      });
    },
    [tempUserId]
  );

  const reactToPost = useCallback(
    (postId: string, type: "worthit" | "skip") => {
      if (reactions[postId]) return;
      setReactions((prev) => {
        const updated = { ...prev, [postId]: type };
        AsyncStorage.setItem(STORAGE_KEYS.REACTIONS, JSON.stringify(updated));
        return updated;
      });
      setPosts((prev) => {
        const updated = prev.map((p) => {
          if (p.id !== postId) return p;
          return {
            ...p,
            worthItCount: type === "worthit" ? p.worthItCount + 1 : p.worthItCount,
            skipCount: type === "skip" ? p.skipCount + 1 : p.skipCount,
          };
        });
        AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updated));
        return updated;
      });
    },
    [reactions]
  );

  const getActivePosts = useCallback(
    (sort: "fresh" | "top" = "fresh") => {
      const now = Date.now();
      const active = posts.filter((p) => p.expiresAt > now);
      if (sort === "top") {
        return [...active].sort(
          (a, b) => b.worthItCount + b.skipCount - (a.worthItCount + a.skipCount)
        );
      }
      return active;
    },
    [posts]
  );

  if (!loaded) return null;

  return (
    <AppContext.Provider
      value={{
        posts,
        reactions,
        tempUserId,
        onboarded,
        setOnboarded,
        addPost,
        reactToPost,
        getActivePosts,
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
