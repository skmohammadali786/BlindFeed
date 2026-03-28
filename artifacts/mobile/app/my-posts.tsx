import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { useApp } from "@/context/AppContext";
import { api, ApiMyPost } from "@/utils/api";
import { timeAgo } from "@/utils/time";
import { ScreenTransition, FadeSlide, AnimatedListItem, AnimatedPressable } from "@/components/Animations";

const NEVER_THRESHOLD_MS = 365 * 24 * 60 * 60 * 1000;

function expiryLabel(expiresAt: string): { label: string; expired: boolean; isNever: boolean } {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms > NEVER_THRESHOLD_MS) return { label: "Never expires", expired: false, isNever: true };
  if (ms <= 0) return { label: "Expired", expired: true, isNever: false };
  const h = Math.floor(ms / (1000 * 60 * 60));
  const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (h >= 24) return { label: `${Math.floor(h / 24)}d left`, expired: false, isNever: false };
  if (h >= 1) return { label: `${h}h ${m}m left`, expired: false, isNever: false };
  return { label: `${m}m left`, expired: false, isNever: false };
}

function PostCard({
  post,
  index,
  onDelete,
  colors,
}: {
  post: ApiMyPost;
  index: number;
  onDelete: (id: number) => void;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  const styles = makeCardStyles(colors);
  const { label: expLabel, expired, isNever } = expiryLabel(post.expiresAt);
  const total = post.worthItCount + post.skipCount;
  const worthPct = total > 0 ? Math.round((post.worthItCount / total) * 100) : 0;

  return (
    <AnimatedListItem index={index}>
      <TouchableOpacity
        style={styles.card}
        onPress={() => !expired && router.push(`/post/${post.id}`)}
        activeOpacity={0.85}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.expiryBadge, expired && styles.expiryBadgeExpired, isNever && styles.expiryBadgeNever]}>
            <Feather name={isNever ? "lock" : "clock"} size={11} color={expired ? "#FF3B30" : isNever ? colors.textSecondary : colors.green} />
            <Text style={[styles.expiryText, expired && styles.expiryTextExpired, isNever && styles.expiryTextNever]}>{expLabel}</Text>
          </View>
          <AnimatedPressable
            scaleTo={0.88}
            onPress={() => onDelete(post.id)}
            style={styles.deleteBtn}
          >
            <Feather name="trash-2" size={15} color="#FF3B30" />
          </AnimatedPressable>
        </View>

        <Text style={styles.content} numberOfLines={3}>{post.content}</Text>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Feather name="check" size={13} color={colors.green} />
            <Text style={styles.statText}>{post.worthItCount}</Text>
          </View>
          <View style={styles.stat}>
            <Feather name="x" size={13} color="#FF3B30" />
            <Text style={styles.statText}>{post.skipCount}</Text>
          </View>
          {total > 0 && (
            <View style={styles.stat}>
              <Feather name="trending-up" size={13} color={colors.textSecondary} />
              <Text style={styles.statText}>{worthPct}%</Text>
            </View>
          )}
          <View style={styles.stat}>
            <Feather name="message-circle" size={13} color={colors.textSecondary} />
            <Text style={styles.statText}>{post.commentCount}</Text>
          </View>
          <Text style={styles.postTime}>{timeAgo(new Date(post.createdAt).getTime())}</Text>
        </View>

        {total > 0 && (
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${worthPct}%` as `${number}%` }]} />
          </View>
        )}

        {post.latestComment && (
          <View style={styles.latestComment}>
            <View style={styles.latestCommentDot} />
            <View style={styles.latestCommentBody}>
              <Text style={styles.latestCommentLabel}>Latest comment</Text>
              <Text style={styles.latestCommentText} numberOfLines={2}>
                {post.latestComment.content}
              </Text>
              <Text style={styles.latestCommentTime}>
                {timeAgo(new Date(post.latestComment.createdAt).getTime())}
              </Text>
            </View>
          </View>
        )}

        {post.commentCount === 0 && (
          <Text style={styles.noComments}>No comments yet</Text>
        )}

        {!expired && (
          <View style={styles.viewRow}>
            <Text style={styles.viewLabel}>Tap to view comments</Text>
            <Feather name="arrow-right" size={13} color={colors.textTertiary} />
          </View>
        )}
      </TouchableOpacity>
    </AnimatedListItem>
  );
}

export default function MyPostsScreen() {
  const { colors } = useTheme();
  const { fetchMyPosts } = useApp();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const top = isWeb ? 67 : insets.top;
  const bottom = isWeb ? 34 : insets.bottom > 0 ? insets.bottom : 16;

  const [posts, setPosts] = useState<ApiMyPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const styles = makeStyles(colors);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchMyPosts();
      setPosts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load posts");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchMyPosts]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = useCallback((postId: number) => {
    Alert.alert(
      "Delete post?",
      "This will permanently remove your post from the feed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/posts/${postId}`);
              if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setPosts((prev) => prev.filter((p) => p.id !== postId));
            } catch {
              Alert.alert("Error", "Could not delete post. Try again.");
            }
          },
        },
      ]
    );
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
  }, [load]);

  const active = posts.filter((p) => new Date(p.expiresAt).getTime() > Date.now());
  const expired = posts.filter((p) => new Date(p.expiresAt).getTime() <= Date.now());

  return (
    <ScreenTransition>
      <View style={[styles.container, { paddingTop: top }]}>
        <FadeSlide delay={0} from="top">
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Feather name="arrow-left" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Posts</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{active.length} active</Text>
            </View>
          </View>
        </FadeSlide>

        {loading ? (
          <FadeSlide delay={80} style={styles.center}>
            <ActivityIndicator size="large" color={colors.green} />
            <Text style={styles.loadingText}>Loading your posts...</Text>
          </FadeSlide>
        ) : error ? (
          <FadeSlide delay={80} style={styles.center}>
            <Feather name="alert-circle" size={40} color={colors.textTertiary} />
            <Text style={[styles.loadingText, { marginTop: 12 }]}>{error}</Text>
            <TouchableOpacity onPress={load} style={{ marginTop: 16 }}>
              <Text style={{ color: colors.green, fontFamily: "Inter_500Medium", fontSize: 15 }}>Try again</Text>
            </TouchableOpacity>
          </FadeSlide>
        ) : (
          <FlatList
            data={[
              ...active,
              ...(expired.length > 0 ? [{ type: "section", label: "Expired" } as any] : []),
              ...expired,
            ]}
            keyExtractor={(item, i) => item.id ? String(item.id) : `section-${i}`}
            renderItem={({ item, index }) => {
              if (item.type === "section") {
                return (
                  <Text style={styles.sectionLabel}>{item.label}</Text>
                );
              }
              return (
                <PostCard
                  post={item as ApiMyPost}
                  index={index}
                  onDelete={handleDelete}
                  colors={colors}
                />
              );
            }}
            contentContainerStyle={[styles.list, { paddingBottom: bottom + 24 }]}
            showsVerticalScrollIndicator={false}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            ListEmptyComponent={
              <FadeSlide delay={80} style={styles.empty}>
                <Feather name="edit-3" size={40} color={colors.textTertiary} />
                <Text style={styles.emptyTitle}>No posts yet</Text>
                <Text style={styles.emptySub}>Your posts will appear here after you publish them</Text>
                <AnimatedPressable
                  style={styles.createBtn}
                  onPress={() => router.push("/create")}
                  scaleTo={0.95}
                >
                  <Text style={styles.createBtnText}>Create a post</Text>
                </AnimatedPressable>
              </FadeSlide>
            }
          />
        )}
      </View>
    </ScreenTransition>
  );
}

function makeCardStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.cardBg,
      borderRadius: 16,
      padding: 16,
      marginHorizontal: 16,
      marginBottom: 12,
      gap: 10,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    expiryBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: colors.greenDim,
      borderRadius: 20,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    expiryBadgeExpired: {
      backgroundColor: "rgba(255,59,48,0.12)",
    },
    expiryBadgeNever: {
      backgroundColor: colors.surface,
    },
    expiryText: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      color: colors.green,
    },
    expiryTextExpired: {
      color: "#FF3B30",
    },
    expiryTextNever: {
      color: colors.textSecondary,
    },
    deleteBtn: {
      padding: 6,
    },
    content: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.text,
      lineHeight: 22,
    },
    statsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      flexWrap: "wrap",
    },
    stat: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    statText: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: colors.textSecondary,
    },
    postTime: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.textTertiary,
      marginLeft: "auto" as any,
    },
    progressBar: {
      height: 3,
      backgroundColor: colors.border,
      borderRadius: 2,
      overflow: "hidden",
    },
    progressFill: {
      height: 3,
      backgroundColor: colors.green,
      borderRadius: 2,
    },
    latestComment: {
      flexDirection: "row",
      gap: 10,
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 10,
    },
    latestCommentDot: {
      width: 3,
      backgroundColor: colors.green,
      borderRadius: 2,
      alignSelf: "stretch",
    },
    latestCommentBody: {
      flex: 1,
      gap: 3,
    },
    latestCommentLabel: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      color: colors.green,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    latestCommentText: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.text,
      lineHeight: 18,
    },
    latestCommentTime: {
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      color: colors.textTertiary,
    },
    noComments: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.textTertiary,
    },
    viewRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    viewLabel: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.textTertiary,
    },
  });
}

function makeStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.surface,
      justifyContent: "center",
      alignItems: "center",
    },
    headerTitle: {
      flex: 1,
      fontSize: 20,
      fontFamily: "Inter_700Bold",
      color: colors.text,
      letterSpacing: -0.3,
    },
    countBadge: {
      backgroundColor: colors.greenDim,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    countText: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: colors.green,
    },
    list: { paddingTop: 8 },
    sectionLabel: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginLeft: 16,
      marginBottom: 8,
      marginTop: 16,
    },
    center: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      gap: 16,
    },
    loadingText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
    },
    empty: {
      paddingTop: 80,
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 40,
    },
    emptyTitle: {
      fontSize: 18,
      fontFamily: "Inter_600SemiBold",
      color: colors.textSecondary,
    },
    emptySub: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.textTertiary,
      textAlign: "center",
      lineHeight: 20,
    },
    createBtn: {
      marginTop: 8,
      paddingHorizontal: 28,
      paddingVertical: 13,
      backgroundColor: colors.green,
      borderRadius: 16,
    },
    createBtnText: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: "#000",
    },
  });
}
