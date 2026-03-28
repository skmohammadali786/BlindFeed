import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { useApp } from "@/context/AppContext";
import { api, ApiComment, getObjectUrl } from "@/utils/api";
import { timeAgo } from "@/utils/time";
import {
  ScreenTransition,
  AnimatedListItem,
  AnimatedPressable,
  useReactionAnim,
} from "@/components/Animations";

const SCREEN_WIDTH = Dimensions.get("window").width;

function parseImageUrls(imageUrl: string | null | undefined): string[] {
  if (!imageUrl) return [];
  if (imageUrl.startsWith("[")) {
    try { return JSON.parse(imageUrl); } catch { return [imageUrl]; }
  }
  return [imageUrl];
}

function hashColor(str: string): string {
  const palette = ["#3DDB85", "#4ECDC4", "#FFE66D", "#F7AEF8", "#B8F0E6", "#FFB347", "#A8DADC", "#E9C46A"];
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

function useTick(intervalMs: number) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}

function timeUntil(ms: number): string {
  const diff = ms - Date.now();
  if (diff <= 0) return "Expired";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h >= 48) return `${Math.floor(h / 24)}d left`;
  if (h >= 1) return `${h}h ${m}m left`;
  return `${m}m left`;
}

function AnonymousAvatar({ seed, size = 40 }: { seed: string; size?: number }) {
  const bg = hashColor(seed);
  const initials = (seed.slice(0, 2) || "??").toUpperCase();
  const fontSize = size * 0.36;
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: bg, justifyContent: "center", alignItems: "center",
      shadowColor: bg, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4,
    }}>
      <Text style={{ fontSize, fontFamily: "Inter_700Bold", color: "#000" }}>{initials}</Text>
    </View>
  );
}

function ImageCarousel({ urls }: { urls: string[] }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const { colors } = useTheme();

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / (SCREEN_WIDTH - 32));
    setActiveIdx(idx);
  };

  if (urls.length === 1) {
    return (
      <Animated.View entering={FadeIn.duration(400)} style={styles.singleImageWrap}>
        <Image source={{ uri: getObjectUrl(urls[0]) }} style={styles.singleImage} contentFit="cover" />
      </Animated.View>
    );
  }

  return (
    <View style={styles.carouselWrap}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        snapToInterval={SCREEN_WIDTH - 32}
        decelerationRate="fast"
        contentContainerStyle={{ gap: 0 }}
      >
        {urls.map((url, i) => (
          <Image
            key={i}
            source={{ uri: getObjectUrl(url) }}
            style={[styles.carouselImage, { width: SCREEN_WIDTH - 32 }]}
            contentFit="cover"
          />
        ))}
      </ScrollView>
      <View style={[styles.dotsRow, { backgroundColor: colors.background }]}>
        {urls.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i === activeIdx ? colors.green : colors.border, width: i === activeIdx ? 16 : 6 },
            ]}
          />
        ))}
        <Text style={[styles.dotsCount, { color: colors.textSecondary }]}>{activeIdx + 1}/{urls.length}</Text>
      </View>
    </View>
  );
}

function VoteBar({ worthPct, colors }: { worthPct: number; colors: ReturnType<typeof useTheme>["colors"] }) {
  const anim = useSharedValue(0);
  useEffect(() => {
    anim.value = withTiming(worthPct / 100, { duration: 700 });
  }, [worthPct]);
  const greenStyle = useAnimatedStyle(() => ({ flex: anim.value === 0 ? 0 : anim.value }));
  const redStyle = useAnimatedStyle(() => ({ flex: anim.value === 1 ? 0 : 1 - anim.value }));

  return (
    <View style={{ gap: 6 }}>
      <View style={styles.splitBar}>
        <Animated.View style={[styles.splitGreen, greenStyle]} />
        <Animated.View style={[styles.splitRed, redStyle]} />
      </View>
      <View style={styles.splitLabels}>
        <Text style={[styles.splitLabel, { color: colors.green }]}>{worthPct}% Worth it</Text>
        <Text style={[styles.splitLabel, { color: "#FF3B30" }]}>{100 - worthPct}% Skip</Text>
      </View>
    </View>
  );
}

function StatCard({ value, label, color, sub }: { value: string | number; label: string; color: string; sub?: string }) {
  const { colors } = useTheme();
  return (
    <View style={[statCardStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[statCardStyles.value, { color }]}>{value}</Text>
      <Text style={[statCardStyles.label, { color: colors.textSecondary }]}>{label}</Text>
      {sub && <Text style={[statCardStyles.sub, { color: colors.textTertiary }]}>{sub}</Text>}
    </View>
  );
}
const statCardStyles = StyleSheet.create({
  card: { flex: 1, alignItems: "center", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 8, borderWidth: 1, gap: 3 },
  value: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  label: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  sub: { fontSize: 10, fontFamily: "Inter_400Regular" },
});

function ReactionBtn({
  active, activeColor, icon, emoji, label, count, onPress, colors,
}: {
  active: boolean; activeColor: string; icon: string; emoji: string; label: string;
  count: number; onPress: () => void; colors: ReturnType<typeof useTheme>["colors"];
}) {
  const { style: animStyle, trigger } = useReactionAnim();
  const scale = useSharedValue(1);
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[{ flex: 1 }, animStyle]}>
      <TouchableOpacity
        style={[
          rxStyles.btn,
          {
            borderColor: active ? activeColor : colors.border,
            backgroundColor: active ? activeColor + "18" : colors.surface,
          },
        ]}
        onPress={() => { trigger(); onPress(); }}
        activeOpacity={0.75}
      >
        <Animated.View style={[rxStyles.emojiWrap, scaleStyle, { backgroundColor: active ? activeColor + "25" : colors.background }]}>
          <Text style={rxStyles.emoji}>{emoji}</Text>
        </Animated.View>
        <View style={rxStyles.labelCol}>
          <Text style={[rxStyles.label, { color: active ? activeColor : colors.text }]}>{label}</Text>
          <Text style={[rxStyles.count, { color: active ? activeColor + "AA" : colors.textTertiary }]}>
            {count.toLocaleString()}
          </Text>
        </View>
        {active && (
          <Animated.View entering={FadeIn.duration(200)} style={rxStyles.activeDot}>
            <Feather name="check-circle" size={16} color={activeColor} />
          </Animated.View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}
const rxStyles = StyleSheet.create({
  btn: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 14, paddingHorizontal: 16, borderRadius: 18, borderWidth: 1.5,
  },
  emojiWrap: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" },
  emoji: { fontSize: 22 },
  labelCol: { flex: 1, gap: 2 },
  label: { fontSize: 15, fontFamily: "Inter_700Bold" },
  count: { fontSize: 12, fontFamily: "Inter_400Regular" },
  activeDot: { marginLeft: "auto" },
});

function CommentItem({
  comment,
  isReply,
  colors,
  onReply,
  onDelete,
}: {
  comment: ApiComment;
  isReply: boolean;
  colors: ReturnType<typeof useTheme>["colors"];
  onReply?: () => void;
  onDelete?: () => void;
}) {
  const avatarColor = hashColor(comment.anonymousId);
  const isOwn = comment.isOwn;

  return (
    <View style={[cmtStyles.row, isReply && cmtStyles.replyRow]}>
      {isReply && (
        <View style={cmtStyles.threadLineWrap}>
          <View style={[cmtStyles.threadLine, { backgroundColor: avatarColor + "55" }]} />
        </View>
      )}
      <AnonymousAvatar seed={comment.anonymousId} size={isReply ? 26 : 34} />
      <View style={cmtStyles.bubble}>
        <View style={[cmtStyles.bubbleInner, {
          backgroundColor: isOwn ? colors.green + "15" : colors.surface,
          borderColor: isOwn ? colors.green + "40" : colors.border,
        }]}>
          <View style={cmtStyles.metaRow}>
            <Text style={[cmtStyles.userId, { color: isOwn ? colors.green : colors.textSecondary }]} numberOfLines={1}>
              {isOwn ? "You" : comment.anonymousId}
            </Text>
            {isOwn && (
              <View style={[cmtStyles.ownBadge, { backgroundColor: colors.green + "25" }]}>
                <Text style={[cmtStyles.ownBadgeText, { color: colors.green }]}>Author</Text>
              </View>
            )}
            <Text style={[cmtStyles.dot, { color: colors.textTertiary }]}>·</Text>
            <Text style={[cmtStyles.time, { color: colors.textTertiary }]}>
              {timeAgo(new Date(comment.createdAt).getTime())}
            </Text>
          </View>
          <Text style={[cmtStyles.text, { color: colors.text }]}>{comment.content}</Text>
        </View>

        <View style={cmtStyles.actionsRow}>
          {!isReply && onReply && (
            <TouchableOpacity onPress={onReply} style={cmtStyles.actionBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="corner-down-right" size={13} color={colors.textTertiary} />
              <Text style={[cmtStyles.actionText, { color: colors.textTertiary }]}>Reply</Text>
            </TouchableOpacity>
          )}
          {isOwn && onDelete && (
            <TouchableOpacity onPress={onDelete} style={[cmtStyles.actionBtn, cmtStyles.deleteBtn]} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="trash-2" size={13} color="#FF3B30" />
              <Text style={[cmtStyles.actionText, { color: "#FF3B30" }]}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}
const cmtStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingHorizontal: 16, paddingVertical: 6 },
  replyRow: { paddingLeft: 32, gap: 8 },
  threadLineWrap: { width: 12, alignSelf: "stretch", alignItems: "center" },
  threadLine: { width: 2, flex: 1, borderRadius: 1, marginTop: 4, marginBottom: 4 },
  bubble: { flex: 1, gap: 6 },
  bubbleInner: { borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14, gap: 6, borderWidth: 1 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5, flexWrap: "wrap" },
  userId: { fontSize: 12, fontFamily: "Inter_700Bold", flexShrink: 1 },
  ownBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  ownBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  dot: { fontSize: 10 },
  time: { fontSize: 11, fontFamily: "Inter_400Regular" },
  text: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21 },
  actionsRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 4 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 2 },
  deleteBtn: { marginLeft: "auto" as any },
  actionText: { fontSize: 12, fontFamily: "Inter_500Medium" },
});

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { posts, reactToPost } = useApp();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const top = isWeb ? 67 : insets.top;
  const bottom = isWeb ? 34 : insets.bottom > 0 ? insets.bottom : 16;

  useTick(30_000);
  const [copied, setCopied] = useState(false);
  const [comments, setComments] = useState<ApiComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<ApiComment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [deleteCommentId, setDeleteCommentId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [remotePost, setRemotePost] = useState<import("@/context/AppContext").Post | null>(null);
  const [postLoading, setPostLoading] = useState(false);
  const [sortNewest, setSortNewest] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const listRef = useRef<FlatList>(null);

  const localPost = posts.find((p) => p.id === id);
  const post = localPost ?? remotePost;
  const reaction = post?.myReaction ?? null;

  useEffect(() => {
    if (!localPost && id) {
      setPostLoading(true);
      api.get<import("@/utils/api").ApiPost>(`/posts/${id}`)
        .then((data) => {
          setRemotePost({
            id: String(data.id),
            content: data.content,
            imageUrl: data.imageUrl,
            videoUrl: data.videoUrl,
            createdAt: new Date(data.createdAt).getTime(),
            expiresAt: new Date(data.expiresAt).getTime(),
            worthItCount: data.worthItCount,
            skipCount: data.skipCount,
            tempUserId: data.anonymousId,
            myReaction: data.myReaction,
            commentCount: data.commentCount,
            isOwn: data.isOwn,
          });
        })
        .catch(() => {})
        .finally(() => setPostLoading(false));
    }
  }, [id, localPost]);

  const fetchComments = useCallback(async () => {
    if (!id) return;
    setCommentsLoading(true);
    try {
      const data = await api.get<ApiComment[]>(`/posts/${id}/comments`);
      setComments(data);
    } catch (_) {}
    finally { setCommentsLoading(false); }
  }, [id]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const handleReact = (type: "worthit" | "skip") => {
    if (!post) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    reactToPost(post.id, type);
  };

  const handleCopy = async () => {
    if (!post) return;
    await Clipboard.setStringAsync(post.content);
    setCopied(true);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmitComment = async () => {
    const text = commentText.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    setCommentError(null);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const body: { content: string; parentId?: number } = { content: text };
      if (replyingTo) body.parentId = replyingTo.id;
      await api.post(`/posts/${id}/comments`, body);
      setCommentText("");
      setReplyingTo(null);
      await fetchComments();
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 200);
    } catch (_) {
      setCommentError("Failed to post comment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = (commentId: number) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDeleteCommentId(commentId);
  };

  const confirmDeleteComment = async () => {
    if (!deleteCommentId || deleting) return;
    setDeleting(true);
    try {
      await api.delete(`/comments/${deleteCommentId}`);
      setDeleteCommentId(null);
      await fetchComments();
    } catch {
      setDeleteCommentId(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleReply = (comment: ApiComment) => {
    setReplyingTo(comment);
    inputRef.current?.focus();
  };

  const styles = makeStyles(colors);

  if (!post) {
    return (
      <View style={[styles.container, { paddingTop: top }]}>
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
            <Feather name="arrow-left" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
        {postLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.green} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading post…</Text>
          </View>
        ) : (
          <View style={styles.center}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.surface }]}>
              <Feather name="file-text" size={32} color={colors.textTertiary} />
            </View>
            <Text style={styles.notFoundTitle}>Post not found</Text>
            <Text style={styles.notFoundSub}>It may have expired or been removed</Text>
            <TouchableOpacity style={[styles.backHomeBtn, { backgroundColor: colors.surface }]} onPress={() => router.replace("/feed")}>
              <Text style={[styles.backHomeBtnText, { color: colors.text }]}>Back to feed</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  const total = post.worthItCount + post.skipCount;
  const worthPct = total > 0 ? Math.round((post.worthItCount / total) * 100) : 0;
  const myWorthIt = reaction === "worthit";
  const mySkip = reaction === "skip";
  const imageUrls = parseImageUrls(post.imageUrl);
  const CONTENT_LIMIT = 300;
  const isLong = post.content.length > CONTENT_LIMIT;
  const displayContent = isLong && !expanded ? post.content.slice(0, CONTENT_LIMIT) + "…" : post.content;

  const sortedComments = sortNewest
    ? [...comments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : [...comments].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  type ListItem =
    | { type: "header" }
    | { type: "comment"; data: ApiComment }
    | { type: "reply"; data: ApiComment; parent: ApiComment }
    | { type: "reactions" }
    | { type: "no-comments" };

  const allItems: ListItem[] = [
    { type: "header" },
    { type: "reactions" },
    ...(comments.length === 0 && !commentsLoading ? [{ type: "no-comments" as const }] : []),
    ...sortedComments.flatMap((c) => [
      { type: "comment" as const, data: c },
      ...c.replies.map((r) => ({ type: "reply" as const, data: r, parent: c })),
    ]),
  ];

  const renderItem = ({ item, index }: { item: ListItem; index: number }) => {
    if (item.type === "header") {
      return (
        <Animated.View entering={FadeInDown.duration(350)} style={styles.postCard}>
          {/* Nav bar */}
          <View style={styles.navBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
              <Feather name="arrow-left" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.navTitle}>Post</Text>
            <View style={styles.navActions}>
              <TouchableOpacity onPress={handleCopy} style={[styles.navBtn, copied && { backgroundColor: colors.greenDim }]}>
                <Feather name={copied ? "check" : "copy"} size={17} color={copied ? colors.green : colors.textSecondary} />
              </TouchableOpacity>
              {!post.isOwn && (
                <TouchableOpacity
                  style={styles.navBtn}
                  onPress={() => router.push({ pathname: "/report", params: { postId: post.id } } as any)}
                >
                  <Feather name="flag" size={17} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Author strip */}
          <View style={styles.authorStrip}>
            <AnonymousAvatar seed={post.tempUserId || "anon"} size={42} />
            <View style={styles.authorInfo}>
              <View style={styles.authorRow}>
                <Text style={[styles.authorId, { color: colors.text }]} numberOfLines={1}>
                  {post.isOwn ? "You" : (post.tempUserId || "Anonymous")}
                </Text>
                {post.isOwn && (
                  <View style={[styles.ownBadge, { backgroundColor: colors.green }]}>
                    <Text style={styles.ownBadgeText}>Your post</Text>
                  </View>
                )}
              </View>
              <View style={styles.authorMeta}>
                <Feather name="clock" size={11} color={colors.textTertiary} />
                <Text style={[styles.authorMetaText, { color: colors.textTertiary }]}>{timeAgo(post.createdAt)}</Text>
                {post.expiresAt && (
                  <>
                    <Text style={[styles.authorMetaText, { color: colors.textTertiary }]}>·</Text>
                    <Feather name="eye-off" size={11} color={colors.textTertiary} />
                    <Text style={[styles.authorMetaText, { color: colors.textTertiary }]}>
                      {timeUntil(post.expiresAt)}
                    </Text>
                  </>
                )}
              </View>
            </View>
            <View style={[styles.anonChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Feather name="shield" size={11} color={colors.textSecondary} />
              <Text style={[styles.anonChipText, { color: colors.textSecondary }]}>Anonymous</Text>
            </View>
          </View>

          {/* Images */}
          {imageUrls.length > 0 && (
            <View style={styles.mediaWrap}>
              <ImageCarousel urls={imageUrls} />
            </View>
          )}

          {/* Video */}
          {post.videoUrl && (
            <View style={[styles.videoContainer, { backgroundColor: colors.surfaceElevated }]}>
              <View style={[styles.videoPlayBtn, { backgroundColor: colors.green }]}>
                <Feather name="play" size={22} color="#000" />
              </View>
              <Text style={[styles.videoNote, { color: colors.textSecondary }]}>Video attached</Text>
            </View>
          )}

          {/* Content */}
          <View style={styles.contentWrap}>
            <Text style={[styles.postContent, { color: colors.text }]}>
              {displayContent}
            </Text>
            {isLong && (
              <TouchableOpacity onPress={() => setExpanded((v) => !v)} style={styles.readMoreBtn}>
                <Text style={[styles.readMoreText, { color: colors.green }]}>
                  {expanded ? "Show less" : "Read more"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Stats cards */}
          <View style={styles.statsGrid}>
            <StatCard
              value={post.worthItCount}
              label="Worth it"
              color={colors.green}
              sub={total > 0 ? `${worthPct}%` : undefined}
            />
            <StatCard
              value={post.skipCount}
              label="Skip"
              color="#FF3B30"
              sub={total > 0 ? `${100 - worthPct}%` : undefined}
            />
            <StatCard
              value={comments.length}
              label="Comments"
              color={colors.text}
            />
          </View>

          {/* Vote bar */}
          {total > 0 && (
            <View style={styles.voteBarWrap}>
              <VoteBar worthPct={worthPct} colors={colors} />
              <Text style={[styles.voteBarSummary, { color: colors.textSecondary }]}>
                {total.toLocaleString()} vote{total !== 1 ? "s" : ""} total
              </Text>
            </View>
          )}

          {/* Manage own post */}
          {post.isOwn && (
            <TouchableOpacity
              style={[styles.managePostBtn, { backgroundColor: colors.greenDim, borderColor: colors.green + "40" }]}
              onPress={() => { router.back(); router.push("/my-posts"); }}
              activeOpacity={0.8}
            >
              <Feather name="layers" size={15} color={colors.green} />
              <Text style={[styles.managePostText, { color: colors.green }]}>Manage in My Posts</Text>
              <Feather name="chevron-right" size={15} color={colors.green} />
            </TouchableOpacity>
          )}

          {/* Comments header */}
          <View style={styles.commentsHeader}>
            <Feather name="message-circle" size={16} color={colors.text} />
            <Text style={[styles.commentsTitle, { color: colors.text }]}>
              Comments {comments.length > 0 ? `(${comments.length})` : ""}
            </Text>
            {commentsLoading && <ActivityIndicator size="small" color={colors.green} />}
            {comments.length > 1 && (
              <TouchableOpacity
                style={[styles.sortToggle, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setSortNewest((v) => !v)}
              >
                <Feather name={sortNewest ? "arrow-down" : "arrow-up"} size={12} color={colors.textSecondary} />
                <Text style={[styles.sortToggleText, { color: colors.textSecondary }]}>
                  {sortNewest ? "Newest" : "Oldest"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      );
    }

    if (item.type === "reactions") {
      if (post.isOwn) return null;
      return (
        <Animated.View entering={FadeInDown.delay(120).duration(350)} style={styles.reactionsBlock}>
          <Text style={[styles.reactionsLabel, { color: colors.textSecondary }]}>
            {reaction ? "Your vote is recorded" : "What do you think?"}
          </Text>
          <View style={styles.reactionRow}>
            <ReactionBtn
              active={myWorthIt}
              activeColor={colors.green}
              icon="check"
              emoji="✅"
              label="Worth it"
              count={post.worthItCount}
              onPress={() => handleReact("worthit")}
              colors={colors}
            />
            <ReactionBtn
              active={mySkip}
              activeColor="#FF3B30"
              icon="x"
              emoji="⏭️"
              label="Skip"
              count={post.skipCount}
              onPress={() => handleReact("skip")}
              colors={colors}
            />
          </View>
        </Animated.View>
      );
    }

    if (item.type === "no-comments") {
      return (
        <View style={styles.noCommentsBlock}>
          <Text style={styles.noCommentsEmoji}>💬</Text>
          <Text style={[styles.noCommentsTitle, { color: colors.text }]}>No comments yet</Text>
          <Text style={[styles.noCommentsSub, { color: colors.textSecondary }]}>Be the first to share your thoughts</Text>
        </View>
      );
    }

    const isReply = item.type === "reply";
    const comment = item.data;

    return (
      <AnimatedListItem index={index}>
        <CommentItem
          comment={comment}
          isReply={isReply}
          colors={colors}
          onReply={!isReply ? () => handleReply(comment) : undefined}
          onDelete={comment.isOwn ? () => handleDeleteComment(comment.id) : undefined}
        />
      </AnimatedListItem>
    );
  };

  return (
    <ScreenTransition>
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: top }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={allItems}
          keyExtractor={(item, i) =>
            item.type === "header" ? "header" :
            item.type === "reactions" ? "reactions" :
            item.type === "no-comments" ? "no-comments" :
            item.type === "reply" ? `reply-${item.data.id}` :
            `comment-${item.data.id}-${i}`
          }
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
        />

        {/* Delete comment modal */}
        <Modal
          visible={deleteCommentId !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setDeleteCommentId(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modal, { backgroundColor: colors.surface }]}>
              <View style={[styles.modalIconWrap, { backgroundColor: "rgba(255,59,48,0.12)" }]}>
                <Feather name="trash-2" size={24} color="#FF3B30" />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Delete comment?</Text>
              <Text style={[styles.modalBody, { color: colors.textSecondary }]}>This action cannot be undone.</Text>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalCancel, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={() => setDeleteCommentId(null)}
                >
                  <Text style={[styles.modalCancelText, { color: colors.text }]}>Keep it</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalConfirm}
                  onPress={confirmDeleteComment}
                  disabled={deleting}
                >
                  {deleting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalConfirmText}>Delete</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Footer: comment input */}
        <View style={[styles.footer, { paddingBottom: bottom, backgroundColor: colors.background, borderTopColor: colors.border }]}>
          {replyingTo && (
            <Animated.View entering={FadeInDown.duration(200)} style={[styles.replyBar, { backgroundColor: colors.greenDim, borderColor: colors.green + "40" }]}>
              <Feather name="corner-down-right" size={13} color={colors.green} />
              <Text style={[styles.replyBarText, { color: colors.green }]} numberOfLines={1}>
                Replying to: "{replyingTo.content.slice(0, 50)}{replyingTo.content.length > 50 ? "…" : ""}"
              </Text>
              <TouchableOpacity onPress={() => setReplyingTo(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="x" size={14} color={colors.green} />
              </TouchableOpacity>
            </Animated.View>
          )}

          {commentError && (
            <View style={[styles.errorBar, { backgroundColor: "rgba(255,59,48,0.1)" }]}>
              <Feather name="alert-circle" size={13} color="#FF3B30" />
              <Text style={styles.errorText}>{commentError}</Text>
              <TouchableOpacity onPress={() => setCommentError(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="x" size={13} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          )}

          <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput
              ref={inputRef}
              style={[styles.input, { color: colors.text }]}
              value={commentText}
              onChangeText={(t) => { setCommentText(t); if (commentError) setCommentError(null); }}
              placeholder={replyingTo ? "Write a reply…" : "Add a comment…"}
              placeholderTextColor={colors.textTertiary}
              multiline
              maxLength={300}
            />
            <AnimatedPressable
              scaleTo={0.88}
              onPress={handleSubmitComment}
              style={[styles.sendBtn, { backgroundColor: commentText.trim() ? colors.green : colors.border }]}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Feather name="send" size={15} color={commentText.trim() ? "#000" : colors.textTertiary} />
              )}
            </AnimatedPressable>
          </View>

          <View style={[styles.anonFooterNote, { borderTopColor: colors.border }]}>
            <Feather name="eye-off" size={11} color={colors.textTertiary} />
            <Text style={[styles.anonFooterText, { color: colors.textTertiary }]}>
              Comments are anonymous — no one knows it's you
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenTransition>
  );
}

const styles = StyleSheet.create({} as any);

function makeStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    navBar: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    navBtn: {
      width: 36, height: 36, borderRadius: 18,
      justifyContent: "center", alignItems: "center",
      backgroundColor: colors.surface,
    },
    navTitle: {
      flex: 1, textAlign: "center",
      fontSize: 16, fontFamily: "Inter_600SemiBold",
      color: colors.text,
    },
    navActions: { flexDirection: "row", gap: 8 },

    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingHorizontal: 32 },
    emptyIcon: { width: 72, height: 72, borderRadius: 36, justifyContent: "center", alignItems: "center" },
    notFoundTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: colors.text },
    notFoundSub: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.textSecondary, textAlign: "center" },
    backHomeBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, marginTop: 8 },
    backHomeBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
    loadingText: { fontSize: 14, fontFamily: "Inter_400Regular" },

    postCard: { paddingBottom: 8 },

    authorStrip: {
      flexDirection: "row", alignItems: "center", gap: 12,
      paddingHorizontal: 16, paddingVertical: 14,
    },
    authorInfo: { flex: 1, gap: 4 },
    authorRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    authorId: { fontSize: 14, fontFamily: "Inter_700Bold", flexShrink: 1 },
    ownBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    ownBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#000" },
    authorMeta: { flexDirection: "row", alignItems: "center", gap: 5, flexWrap: "wrap" },
    authorMetaText: { fontSize: 12, fontFamily: "Inter_400Regular" },
    anonChip: {
      flexDirection: "row", alignItems: "center", gap: 4,
      paddingHorizontal: 10, paddingVertical: 5,
      borderRadius: 20, borderWidth: 1,
    },
    anonChipText: { fontSize: 11, fontFamily: "Inter_500Medium" },

    mediaWrap: { paddingHorizontal: 16, marginBottom: 14 },

    videoContainer: {
      marginHorizontal: 16, borderRadius: 16, height: 160,
      justifyContent: "center", alignItems: "center", gap: 12, marginBottom: 14,
    },
    videoPlayBtn: { width: 56, height: 56, borderRadius: 28, justifyContent: "center", alignItems: "center" },
    videoNote: { fontSize: 13, fontFamily: "Inter_400Regular" },

    contentWrap: { paddingHorizontal: 16, marginBottom: 16, gap: 8 },
    postContent: { fontSize: 19, fontFamily: "Inter_400Regular", lineHeight: 29, letterSpacing: -0.2 },
    readMoreBtn: { alignSelf: "flex-start" },
    readMoreText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

    statsGrid: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 12 },

    voteBarWrap: { paddingHorizontal: 16, marginBottom: 16, gap: 6 },
    voteBarSummary: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },

    managePostBtn: {
      flexDirection: "row", alignItems: "center", gap: 10,
      marginHorizontal: 16, marginBottom: 14,
      paddingHorizontal: 16, paddingVertical: 13,
      borderRadius: 14, borderWidth: 1,
    },
    managePostText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },

    commentsHeader: {
      flexDirection: "row", alignItems: "center", gap: 8,
      paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12,
      borderTopWidth: 1, borderTopColor: colors.border,
    },
    commentsTitle: { flex: 1, fontSize: 15, fontFamily: "Inter_700Bold" },
    sortToggle: {
      flexDirection: "row", alignItems: "center", gap: 4,
      paddingHorizontal: 10, paddingVertical: 5,
      borderRadius: 12, borderWidth: 1,
    },
    sortToggleText: { fontSize: 11, fontFamily: "Inter_500Medium" },

    reactionsBlock: { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
    reactionsLabel: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
    reactionRow: { flexDirection: "row", gap: 12 },

    noCommentsBlock: { alignItems: "center", paddingVertical: 32, gap: 8 },
    noCommentsEmoji: { fontSize: 36 },
    noCommentsTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
    noCommentsSub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },

    footer: {
      borderTopWidth: 1,
      paddingTop: 10,
      paddingHorizontal: 12,
      gap: 8,
    },
    replyBar: {
      flexDirection: "row", alignItems: "center", gap: 8,
      paddingHorizontal: 12, paddingVertical: 8,
      borderRadius: 10, borderWidth: 1,
    },
    replyBarText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium" },
    errorBar: {
      flexDirection: "row", alignItems: "center", gap: 8,
      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    },
    errorText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: "#FF3B30" },
    inputRow: {
      flexDirection: "row", alignItems: "flex-end", gap: 10,
      borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
      borderWidth: 1, minHeight: 46,
    },
    input: {
      flex: 1, fontSize: 15, fontFamily: "Inter_400Regular",
      maxHeight: 100, paddingTop: 4,
    },
    sendBtn: {
      width: 36, height: 36, borderRadius: 18,
      justifyContent: "center", alignItems: "center",
    },
    anonFooterNote: {
      flexDirection: "row", alignItems: "center", gap: 5,
      justifyContent: "center", paddingTop: 8, borderTopWidth: 1,
    },
    anonFooterText: { fontSize: 11, fontFamily: "Inter_400Regular" },

    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
    modal: { width: "100%", borderRadius: 20, padding: 24, gap: 8 },
    modalIconWrap: { alignSelf: "center", width: 56, height: 56, borderRadius: 28, justifyContent: "center", alignItems: "center", marginBottom: 4 },
    modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
    modalBody: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21, marginBottom: 8 },
    modalActions: { flexDirection: "row", gap: 10 },
    modalCancel: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center", borderWidth: 1 },
    modalCancelText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
    modalConfirm: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center", backgroundColor: "#FF3B30" },
    modalConfirmText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
  });
}

const styles2 = StyleSheet.create({
  singleImageWrap: { borderRadius: 16, overflow: "hidden", marginBottom: 0 },
  singleImage: { width: "100%", height: 260, borderRadius: 16 },
  carouselWrap: { marginBottom: 0 },
  carouselImage: { height: 260, borderRadius: 16 },
  dotsRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 10 },
  dot: { height: 6, borderRadius: 3 },
  dotsCount: { fontSize: 11, fontFamily: "Inter_400Regular", marginLeft: 6 },
  splitBar: { flexDirection: "row", height: 8, borderRadius: 4, overflow: "hidden", backgroundColor: "#FF3B3022" },
  splitGreen: { backgroundColor: "#3DDB85" },
  splitRed: { backgroundColor: "#FF3B30" },
  splitLabels: { flexDirection: "row", justifyContent: "space-between" },
  splitLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});

const { singleImageWrap, singleImage, carouselWrap, carouselImage, dotsRow, dot, dotsCount, splitBar, splitGreen, splitRed, splitLabels, splitLabel } = styles2;

Object.assign(styles, styles2);
