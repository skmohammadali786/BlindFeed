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
  imageUri?: string;
  createdAt: number;
  expiresAt: number;
  worthItCount: number;
  skipCount: number;
  tempUserId: string;
}

export interface Reaction {
  postId: string;
  type: "worthit" | "skip";
}

interface AppContextType {
  posts: Post[];
  reactions: Record<string, "worthit" | "skip">;
  tempUserId: string;
  addPost: (content: string, imageUri?: string) => Post;
  reactToPost: (postId: string, type: "worthit" | "skip") => void;
  getActivePosts: () => Post[];
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEYS = {
  POSTS: "blindfeed_posts",
  REACTIONS: "blindfeed_reactions",
  USER_ID: "blindfeed_user_id",
  USER_CREATED: "blindfeed_user_created",
};

const POST_EXPIRY_MS = 48 * 60 * 60 * 1000; // 48 hours
const USER_RESET_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

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
      "The best ideas don't need a face behind them. They just need to be heard.",
    createdAt: Date.now() - 1000 * 60 * 45,
    worthItCount: 24,
    skipCount: 3,
  },
  {
    content:
      "We spend more time curating our online identity than actually living. What if we just... stopped?",
    createdAt: Date.now() - 1000 * 60 * 90,
    worthItCount: 67,
    skipCount: 11,
  },
  {
    content:
      "Hot take: most 'thought leaders' are just people who got lucky and learned to talk confidently about it.",
    createdAt: Date.now() - 1000 * 60 * 120,
    worthItCount: 102,
    skipCount: 44,
  },
  {
    content:
      "Silence is underrated. Not every moment needs to be documented, shared, and validated.",
    createdAt: Date.now() - 1000 * 60 * 180,
    worthItCount: 38,
    skipCount: 7,
  },
  {
    content:
      "The algorithm punishes authenticity and rewards spectacle. We built the cage and then complained we couldn't fly.",
    createdAt: Date.now() - 1000 * 60 * 220,
    worthItCount: 89,
    skipCount: 19,
  },
];

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [reactions, setReactions] = useState<Record<string, "worthit" | "skip">>({});
  const [tempUserId, setTempUserId] = useState<string>("#------");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [postsRaw, reactionsRaw, userIdRaw, userCreatedRaw] =
        await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.POSTS),
          AsyncStorage.getItem(STORAGE_KEYS.REACTIONS),
          AsyncStorage.getItem(STORAGE_KEYS.USER_ID),
          AsyncStorage.getItem(STORAGE_KEYS.USER_CREATED),
        ]);

      // Handle user ID rotation
      let userId = userIdRaw;
      const userCreated = userCreatedRaw ? parseInt(userCreatedRaw) : null;
      if (!userId || !userCreated || Date.now() - userCreated > USER_RESET_MS) {
        userId = generateUserId();
        await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, userId);
        await AsyncStorage.setItem(
          STORAGE_KEYS.USER_CREATED,
          Date.now().toString()
        );
      }
      setTempUserId(userId);

      // Load reactions
      const parsedReactions = reactionsRaw ? JSON.parse(reactionsRaw) : {};
      setReactions(parsedReactions);

      // Load or seed posts
      let parsedPosts: Post[] = postsRaw ? JSON.parse(postsRaw) : [];

      // Remove expired posts
      const now = Date.now();
      parsedPosts = parsedPosts.filter((p) => p.expiresAt > now);

      // Seed with sample posts if none exist
      if (parsedPosts.length === 0) {
        parsedPosts = SEED_POSTS.map((seed) => ({
          ...seed,
          id: generateId(),
          expiresAt: seed.createdAt + POST_EXPIRY_MS,
          tempUserId: generateUserId(),
        }));
      }

      parsedPosts.sort((a, b) => b.createdAt - a.createdAt);
      setPosts(parsedPosts);
      await AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(parsedPosts));
    } catch (e) {
      // ignore
    }
  };

  const addPost = useCallback(
    (content: string, imageUri?: string): Post => {
      const newPost: Post = {
        id: generateId(),
        content,
        imageUri,
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
      return newPost;
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

  const getActivePosts = useCallback(() => {
    const now = Date.now();
    return posts.filter((p) => p.expiresAt > now);
  }, [posts]);

  return (
    <AppContext.Provider
      value={{
        posts,
        reactions,
        tempUserId,
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
