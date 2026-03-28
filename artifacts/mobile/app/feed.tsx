import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { Post, useApp } from "@/context/AppContext";
import { getObjectUrl } from "@/utils/api";
import { timeAgo } from "@/utils/time";
import {
  ScreenTransition,
  FadeSlide,
  AnimatedListItem,
  BounceFab,
  AnimatedPressable,
  useReactionAnim,
} from "@/components/Animations";

type SortMode = "fresh" | "top";

function ReactionBtn({
  active,
  activeColor,
  icon,
  label,
  count,
  onPress,
  colors,
}: {
  active: boolean;
  activeColor: string;
  icon: string;
  label: string;
  count: number;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  const { style: animStyle, trigger } = useReactionAnim();
  const handlePress = () => {
    trigger();
    onPress();
  };
  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity
        style={[
          styles_reaction.btn,
          { borderColor: active ? activeColor : colors.border, backgroundColor: active ? `${activeColor}18` : colors.buttonBg },
        ]}
        onPress={handlePress}
        activeOpacity={0.75}
      >
        <Feather name={icon as any} size={14} color={active ? activeColor : colors.textSecondary} />
        <Text style={[styles_reaction.text, { color: active ? activeColor : colors.textSecondary }]}>
          {label}{"  "}
          <Text style={[styles_reaction.count, { color: active ? activeColor : colors.textSecondary }]}>
            ({count})
          </Text>
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles_reaction = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  text: { fontSize: 13, fontFamily: "Inter_500Medium" },
  count: { fontSize: 12, fontFamily: "Inter_400Regular" },
});

function PostCard({
  post,
  index,
  onReact,
  onPress,
  colors,
}: {
  post: Post;
  index: number;
  onReact: (type: "worthit" | "skip") => void;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  const myWorthIt = post.myReaction === "worthit";
  const mySkip = post.myReaction === "skip";
  const total = post.worthItCount + post.skipCount;
  const worthPct = total > 0 ? Math.round((post.worthItCount / total) * 100) : 0;

  const styles = makeCardStyles(colors);

  const handleReact = (type: "worthit" | "skip") => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onReact(type);
  };

  return (
    <AnimatedListItem index={index}>
      <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
        {post.imageUrl && (
          <Image
            source={{ uri: getObjectUrl(post.imageUrl) }}
            style={styles.postImage}
            contentFit="cover"
          />
        )}
        <Text style={styles.cardText}>{post.content}</Text>
        <View style={styles.cardMeta}>
          <Text style={styles.cardTime}>{timeAgo(post.createdAt)}</Text>
          {post.commentCount > 0 && (
            <View style={styles.commentPill}>
              <Feather name="message-circle" size={11} color={colors.textSecondary} />
              <Text style={styles.commentCount}>{post.commentCount}</Text>
            </View>
          )}
        </View>
        {total > 0 && (
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${worthPct}%` as `${number}%` }]} />
          </View>
        )}
        {post.isOwn ? (
          <TouchableOpacity
            style={styles.ownPostBanner}
            onPress={(e) => { e.stopPropagation?.(); router.push("/my-posts"); }}
            activeOpacity={0.75}
          >
            <View style={styles.ownPostLeft}>
              <Feather name="user" size={13} color={colors.green} />
              <Text style={styles.ownPostLabel}>Your post</Text>
            </View>
            <View style={styles.ownPostRight}>
              <Text style={styles.ownPostManage}>Manage</Text>
              <Feather name="arrow-right" size={13} color={colors.green} />
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.cardActions}>
            <ReactionBtn
              active={myWorthIt}
              activeColor={colors.green}
              icon="check"
              label="Worth it"
              count={post.worthItCount}
              onPress={() => handleReact("worthit")}
              colors={colors}
            />
            <ReactionBtn
              active={mySkip}
              activeColor="#FF3B30"
              icon="x"
              label="Skip"
              count={post.skipCount}
              onPress={() => handleReact("skip")}
              colors={colors}
            />
          </View>
        )}
      </TouchableOpacity>
    </AnimatedListItem>
  );
}

const POLL_INTERVAL_MS = 30_000;

export default function FeedScreen() {
  const { colors } = useTheme();
  const { getActivePosts, reactToPost, refreshFeed, feedLoading, feedError } = useApp();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const top = isWeb ? 67 : insets.top;
  const bottom = isWeb ? 34 : insets.bottom > 0 ? insets.bottom : 16;

  const [sortMode, setSortMode] = useState<SortMode>("fresh");
  const [menuVisible, setMenuVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [newPostsBanner, setNewPostsBanner] = useState(false);
  const lastPostCountRef = useRef<number>(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activePosts = getActivePosts(sortMode);

  useEffect(() => {
    lastPostCountRef.current = activePosts.length;
  }, []);

  useEffect(() => {
    pollingRef.current = setInterval(async () => {
      if (sortMode !== "fresh") return;
      try {
        const prev = lastPostCountRef.current;
        await refreshFeed(sortMode);
        const next = getActivePosts("fresh").length;
        if (next > prev) {
          setNewPostsBanner(true);
        }
      } catch (_) {}
    }, POLL_INTERVAL_MS);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [sortMode]);

  const handleBannerPress = useCallback(() => {
    setNewPostsBanner(false);
    lastPostCountRef.current = activePosts.length;
  }, [activePosts.length]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setNewPostsBanner(false);
    await refreshFeed(sortMode);
    lastPostCountRef.current = getActivePosts(sortMode).length;
    setRefreshing(false);
  }, [refreshFeed, sortMode, getActivePosts]);

  const handleSortChange = useCallback(
    (mode: SortMode) => {
      setSortMode(mode);
      setNewPostsBanner(false);
      refreshFeed(mode);
    },
    [refreshFeed],
  );

  const handleReact = useCallback(
    (postId: string, type: "worthit" | "skip") => {
      reactToPost(postId, type);
    },
    [reactToPost],
  );

  const styles = makeStyles(colors);

  return (
    <ScreenTransition>
      <View style={[styles.container, { paddingTop: top }]}>
        <FadeSlide delay={0} from="top">
          <View style={styles.header}>
            <AnimatedPressable scaleTo={0.88} onPress={() => setMenuVisible(true)} style={styles.avatarBtn}>
              <View style={styles.avatar}>
                <Feather name="user" size={16} color={colors.textSecondary} />
              </View>
            </AnimatedPressable>

            <View style={styles.sortToggle}>
              {(["fresh", "top"] as SortMode[]).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[styles.sortBtn, sortMode === mode && styles.sortBtnActive]}
                  onPress={() => handleSortChange(mode)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.sortBtnText, sortMode === mode && styles.sortBtnTextActive]}>
                    {mode === "fresh" ? "Fresh" : "Top"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <AnimatedPressable scaleTo={0.88} onPress={() => router.push("/search")} style={styles.searchBtn}>
              <Feather name="search" size={20} color={colors.textSecondary} />
            </AnimatedPressable>
          </View>
        </FadeSlide>

        {newPostsBanner && (
          <TouchableOpacity style={styles.newPostsBanner} onPress={handleBannerPress} activeOpacity={0.85}>
            <Feather name="arrow-up" size={13} color="#000" />
            <Text style={styles.newPostsBannerText}>New posts available — tap to dismiss</Text>
          </TouchableOpacity>
        )}

        {feedLoading && activePosts.length === 0 ? (
          <FadeSlide delay={100} style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.green} />
            <Text style={styles.loadingText}>Loading posts...</Text>
          </FadeSlide>
        ) : feedError ? (
          <FadeSlide delay={100} style={styles.errorContainer}>
            <Feather
              name={feedError.toLowerCase().includes("internet") || feedError.toLowerCase().includes("connection") ? "wifi-off" : "alert-circle"}
              size={44}
              color={colors.textTertiary}
            />
            <Text style={styles.errorText}>
              {feedError.toLowerCase().includes("internet") || feedError.toLowerCase().includes("connection")
                ? "You're offline"
                : "Something went wrong"}
            </Text>
            <Text style={styles.errorSub}>
              {feedError.toLowerCase().includes("internet") || feedError.toLowerCase().includes("connection")
                ? "Check your connection and try again."
                : feedError}
            </Text>
            <AnimatedPressable style={styles.retryBtn} onPress={() => refreshFeed(sortMode)} scaleTo={0.93}>
              <Text style={styles.retryText}>Try again</Text>
            </AnimatedPressable>
          </FadeSlide>
        ) : (
          <FlatList
            data={activePosts}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <PostCard
                post={item}
                index={index}
                onReact={(type) => handleReact(item.id, type)}
                onPress={() => router.push(`/post/${item.id}`)}
                colors={colors}
              />
            )}
            contentContainerStyle={[styles.list, { paddingBottom: bottom + 100 }]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.green} />
            }
            ListEmptyComponent={
              <FadeSlide delay={80} style={styles.empty}>
                <Feather name="wind" size={40} color={colors.textTertiary} />
                <Text style={styles.emptyTitle}>Nothing here yet</Text>
                <Text style={styles.emptySub}>Be the first to post something</Text>
              </FadeSlide>
            }
          />
        )}

        <BounceFab style={[styles.fabWrapper, { bottom: bottom + 20 }]}>
          <AnimatedPressable scaleTo={0.88} onPress={() => router.push("/create")} style={styles.fab}>
            <View style={styles.fabInner}>
              <Feather name="edit-2" size={20} color="#000" />
            </View>
          </AnimatedPressable>
        </BounceFab>

        <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
          <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
            <View style={styles.menuOverlay} />
          </TouchableWithoutFeedback>
          <View style={[styles.menuContainer, { top: top + 56 }]}>
            {[
              { label: "My Posts", icon: "layers", route: "/my-posts" },
              { label: "Activity", icon: "bell", route: "/notifications" },
              { label: "Your Identity", icon: "user", route: "/identity" },
              { label: "Settings", icon: "settings", route: "/settings" },
              { label: "Usage Insights", icon: "bar-chart-2", route: "/usage-insights" },
              { label: "Community Guidelines", icon: "book-open", route: "/community-guidelines" },
            ].map((item, i) => (
              <AnimatedListItem key={item.route} index={i}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setMenuVisible(false);
                    router.push(item.route as never);
                  }}
                >
                  <Feather name={item.icon as never} size={16} color={colors.text} />
                  <Text style={styles.menuLabel}>{item.label}</Text>
                </TouchableOpacity>
              </AnimatedListItem>
            ))}
          </View>
        </Modal>
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
    postImage: { width: "100%", height: 180, borderRadius: 10 },
    cardText: { fontSize: 16, fontFamily: "Inter_400Regular", color: colors.text, lineHeight: 24 },
    cardMeta: { flexDirection: "row", alignItems: "center", gap: 10 },
    cardTime: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.textSecondary },
    commentPill: { flexDirection: "row", alignItems: "center", gap: 4 },
    commentCount: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.textSecondary },
    progressBar: { height: 3, backgroundColor: colors.border, borderRadius: 2, overflow: "hidden" },
    progressFill: { height: 3, backgroundColor: colors.green, borderRadius: 2 },
    cardActions: { flexDirection: "row", gap: 8 },
    ownPostBanner: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.greenDim,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    ownPostLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
    ownPostLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.green },
    ownPostRight: { flexDirection: "row", alignItems: "center", gap: 4 },
    ownPostManage: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.green },
  });
}

function makeStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    avatarBtn: { padding: 4 },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surface,
      justifyContent: "center",
      alignItems: "center",
    },
    sortToggle: { flexDirection: "row", backgroundColor: colors.surface, borderRadius: 20, padding: 3 },
    sortBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 17 },
    sortBtnActive: { backgroundColor: colors.surfaceElevated },
    sortBtnText: { fontSize: 14, fontFamily: "Inter_500Medium", color: colors.textSecondary },
    sortBtnTextActive: { color: colors.text },
    searchBtn: { padding: 4 },
    list: { paddingTop: 4 },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      gap: 16,
    },
    loadingText: { fontSize: 15, fontFamily: "Inter_400Regular", color: colors.textSecondary },
    errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, paddingHorizontal: 40 },
    errorText: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.text },
    errorSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.textSecondary, textAlign: "center" },
    retryBtn: {
      marginTop: 8,
      paddingHorizontal: 24,
      paddingVertical: 10,
      backgroundColor: colors.surface,
      borderRadius: 20,
    },
    retryText: { fontSize: 14, fontFamily: "Inter_500Medium", color: colors.green },
    empty: { paddingTop: 80, alignItems: "center", gap: 12 },
    emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.textSecondary },
    emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.textTertiary },
    fabWrapper: { position: "absolute", right: 20 },
    fab: {
      width: 62,
      height: 62,
      borderRadius: 31,
      backgroundColor: "#3DDB85",
      justifyContent: "center",
      alignItems: "center",
      shadowColor: "#3DDB85",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.55,
      shadowRadius: 16,
      elevation: 14,
    },
    fabInner: {
      width: 62,
      height: 62,
      borderRadius: 31,
      justifyContent: "center",
      alignItems: "center",
    },
    newPostsBanner: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      marginHorizontal: 60,
      marginBottom: 6,
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: "#3DDB85",
      borderRadius: 20,
    },
    newPostsBannerText: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: "#000",
    },
    menuOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)" },
    menuContainer: {
      position: "absolute",
      left: 16,
      backgroundColor: colors.surface,
      borderRadius: 14,
      overflow: "hidden",
      minWidth: 220,
    },
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 14,
      paddingHorizontal: 18,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    menuLabel: { fontSize: 15, fontFamily: "Inter_500Medium", color: colors.text },
  });
}
