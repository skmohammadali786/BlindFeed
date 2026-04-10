import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  withTiming,
  Easing,
  FadeInDown,
  FadeOutUp,
} from "react-native-reanimated";
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

const HEADER_HEIGHT = 60;

const AVATAR_COLORS = ["#3DDB85","#4A9EFF","#FF6B6B","#FFB84D","#B57BFF","#FF7EB3","#4DD9DC","#FF9D6B"];
function avatarColor(id: string) { return AVATAR_COLORS[id.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length]; }
function initials(id: string) { return id.slice(0, 2).toUpperCase(); }

function parseImageUrls(imageUrl: string | null | undefined): string[] {
  if (!imageUrl) return [];
  if (imageUrl.startsWith("[")) {
    try { return JSON.parse(imageUrl); } catch { return [imageUrl]; }
  }
  return [imageUrl];
}

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
    <Animated.View style={[animStyle, { flex: 1 }]}>
      <TouchableOpacity
        style={[
          styles_reaction.btn,
          { borderColor: active ? activeColor : colors.border, backgroundColor: active ? `${activeColor}14` : colors.surface },
        ]}
        onPress={handlePress}
        activeOpacity={0.75}
      >
        <View style={[styles_reaction.iconCircle, { backgroundColor: active ? `${activeColor}22` : colors.background }]}>
          <Feather name={icon as any} size={15} color={active ? activeColor : colors.textSecondary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles_reaction.label, { color: active ? activeColor : colors.text }]}>{label}</Text>
          <Text style={[styles_reaction.count, { color: active ? activeColor + "99" : colors.textTertiary }]}>{count.toLocaleString()}</Text>
        </View>
        {active && <Feather name="check-circle" size={14} color={activeColor} />}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles_reaction = StyleSheet.create({
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  iconCircle: { width: 34, height: 34, borderRadius: 17, justifyContent: "center", alignItems: "center" },
  label: { fontSize: 13, fontFamily: "JetBrainsMono_600SemiBold" },
  count: { fontSize: 11, fontFamily: "JetBrainsMono_400Regular", marginTop: 1 },
});

function useTick(intervalMs: number) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}

function FirstPostBanner({ colors }: { colors: ReturnType<typeof useTheme>["colors"] }) {
  return (
    <View style={{ marginHorizontal: 16, marginBottom: 14, borderRadius: 20, overflow: "hidden", backgroundColor: colors.cardBg, borderWidth: 1.5, borderColor: colors.green + "44", shadowColor: colors.green, shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 }}>
      <View style={{ paddingHorizontal: 20, paddingVertical: 22, alignItems: "center", gap: 6 }}>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.greenDim, justifyContent: "center", alignItems: "center", marginBottom: 4 }}>
          <Feather name="edit-2" size={22} color={colors.green} />
        </View>
        <Text style={{ fontSize: 17, fontFamily: "JetBrainsMono_700Bold", color: colors.text, textAlign: "center" }}>You haven't posted yet</Text>
        <Text style={{ fontSize: 13, fontFamily: "JetBrainsMono_400Regular", color: colors.textSecondary, textAlign: "center", lineHeight: 19, paddingHorizontal: 10 }}>
          Share what's on your mind — completely anonymously. No profile, no judgement. Just your story.
        </Text>
        <AnimatedPressable
          scaleTo={0.95}
          onPress={() => router.push("/create")}
          style={{ marginTop: 10, backgroundColor: colors.green, paddingHorizontal: 28, paddingVertical: 13, borderRadius: 14 }}
        >
          <Text style={{ fontSize: 14, fontFamily: "JetBrainsMono_700Bold", color: "#000" }}>Write your first post</Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}

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
  useTick(30_000);
  const myWorthIt = post.myReaction === "worthit";
  const mySkip = post.myReaction === "skip";
  const total = post.worthItCount + post.skipCount;
  const worthPct = total > 0 ? Math.round((post.worthItCount / total) * 100) : 0;

  const styles = makeCardStyles(colors);

  const handleReact = (type: "worthit" | "skip") => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onReact(type);
  };

  const userId = post.isOwn ? "yo" : (post.tempUserId || "an");
  const aColor = post.isOwn ? colors.green : avatarColor(userId);

  return (
    <AnimatedListItem index={index}>
      <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
        {/* Colored accent line at top */}
        <View style={[styles.cardAccent, { backgroundColor: aColor }]} />
        {(() => {
          const imgs = parseImageUrls(post.imageUrl);
          if (imgs.length === 0) return null;
          return (
            <View style={styles.imageWrap}>
              <Image
                source={{ uri: getObjectUrl(imgs[0]) }}
                style={styles.postImage}
                contentFit="cover"
              />
              {imgs.length > 1 && (
                <View style={styles.moreImagesTag}>
                  <Feather name="image" size={11} color="#fff" />
                  <Text style={styles.moreImagesText}>+{imgs.length - 1}</Text>
                </View>
              )}
              {post.videoUrl && (
                <View style={styles.videoIndicator}>
                  <Feather name="play-circle" size={13} color="#fff" />
                  <Text style={styles.videoIndicatorText}>Video</Text>
                </View>
              )}
            </View>
          );
        })()}
        {!post.imageUrl && post.videoUrl && (
          <View style={styles.videoChip}>
            <Feather name="play-circle" size={13} color={colors.textSecondary} />
            <Text style={styles.videoChipText}>Video</Text>
          </View>
        )}

        <View style={styles.posterRow}>
          <View style={[styles.posterAvatar, { backgroundColor: aColor + "22" }]}>
            {post.isOwn
              ? <Feather name="user" size={13} color={aColor} />
              : <Text style={[styles.posterInitials, { color: aColor }]}>{initials(userId)}</Text>
            }
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.posterIdText} numberOfLines={1}>
              {post.isOwn ? "You" : post.tempUserId}
            </Text>
            <Text style={styles.posterTime}>{timeAgo(post.createdAt)}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            {!post.isOwn && (
              <View onStartShouldSetResponder={() => true}>
                <TouchableOpacity
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  onPress={() => router.push({ pathname: "/report", params: { postId: String(post.id) } } as any)}
                  style={styles.flagBtn}
                >
                  <Feather name="flag" size={13} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.tapHint}>
              <Feather name="arrow-right" size={12} color={colors.textTertiary} />
            </View>
          </View>
        </View>

        <Text style={styles.cardText} numberOfLines={5}>{post.content}</Text>

        <View style={styles.cardMeta}>
          {post.isSensitive && (
            <View style={[styles.metaChip, { backgroundColor: "#FF9D0020" }]}>
              <Feather name="alert-triangle" size={11} color="#E68A00" />
              <Text style={[styles.metaChipText, { color: "#E68A00" }]}>Sensitive</Text>
            </View>
          )}
          {post.commentCount > 0 && (
            <View style={[styles.metaChip, { backgroundColor: colors.surface }]}>
              <Feather name="message-circle" size={12} color={colors.textSecondary} />
              <Text style={styles.metaChipText}>{post.commentCount} comment{post.commentCount !== 1 ? "s" : ""}</Text>
            </View>
          )}
          {total > 0 && (
            <View style={[styles.metaChip, { backgroundColor: colors.surface }]}>
              <Feather name="bar-chart-2" size={12} color={colors.textSecondary} />
              <Text style={styles.metaChipText}>{total} vote{total !== 1 ? "s" : ""}</Text>
            </View>
          )}
        </View>

        {total > 0 && (
          <View style={{ marginBottom: 2 }}>
            <View style={styles.voteBarTrack}>
              <View style={[styles.voteBarGreen, { flex: post.worthItCount }]} />
              <View style={[styles.voteBarRed, { flex: post.skipCount }]} />
            </View>
            <View style={styles.voteBarLabels}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.green }} />
                <Text style={[styles.voteBarPct, { color: colors.green }]}>{worthPct}% worth it</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Text style={[styles.voteBarPct, { color: "#FF3B30" }]}>{100 - worthPct}% skip</Text>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "#FF3B30" }} />
              </View>
            </View>
          </View>
        )}

        {post.isOwn ? (
          <View onStartShouldSetResponder={() => true}>
            <TouchableOpacity
              style={styles.ownPostBanner}
              onPress={() => router.push("/my-posts")}
              activeOpacity={0.75}
            >
              <View style={styles.ownPostLeft}>
                <View style={[styles.ownPostDot, { backgroundColor: colors.green }]} />
                <Text style={styles.ownPostLabel}>Your post</Text>
              </View>
              <View style={styles.ownPostRight}>
                <Text style={styles.ownPostManage}>Manage</Text>
                <Feather name="arrow-right" size={13} color={colors.green} />
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cardActions} onStartShouldSetResponder={() => true}>
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
  const { getActivePosts, fetchMyPosts, reactToPost, refreshFeed, feedLoading, feedError } = useApp();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const top = isWeb ? 67 : insets.top;
  const bottom = isWeb ? 34 : insets.bottom > 0 ? insets.bottom : 16;

  const [sortMode, setSortMode] = useState<SortMode>("fresh");
  const [menuVisible, setMenuVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [newPostsBanner, setNewPostsBanner] = useState(false);
  const [sensitivePost, setSensitivePost] = useState<Post | null>(null);
  const [userHasPosted, setUserHasPosted] = useState<boolean | null>(null);

  useEffect(() => {
    fetchMyPosts()
      .then((myPosts) => setUserHasPosted(myPosts.length > 0))
      .catch(() => {
        // On error (e.g. network/auth), don't show the banner — stay null (unknown)
      });
  }, [fetchMyPosts]);

  const lastPostCountRef = useRef<number>(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const headerTranslateY = useSharedValue(0);
  const lastScrollY = useSharedValue(0);
  const headerAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headerTranslateY.value }],
    opacity: 1 - Math.abs(headerTranslateY.value) / HEADER_HEIGHT,
  }));
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const y = event.contentOffset.y;
      const diff = y - lastScrollY.value;
      if (diff > 4 && y > 30) {
        headerTranslateY.value = withTiming(-HEADER_HEIGHT, { duration: 220, easing: Easing.out(Easing.quad) });
      } else if (diff < -4) {
        headerTranslateY.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.quad) });
      }
      lastScrollY.value = y;
    },
  });

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
  const showFirstPostBanner = userHasPosted === false && !feedLoading;

  return (
    <ScreenTransition>
      <View style={styles.container}>

        {/* Animated header — slides away on scroll down, back on scroll up */}
        <Animated.View style={[styles.header, headerAnimStyle, { top }]}>
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
        </Animated.View>

        {newPostsBanner && (
          <Animated.View entering={FadeInDown.duration(350).springify().damping(14)} exiting={FadeOutUp.duration(220)} style={[styles.newPostsBannerWrap, { top: top + HEADER_HEIGHT + 10 }]}>
            <TouchableOpacity style={styles.newPostsBanner} onPress={handleRefresh} activeOpacity={0.88}>
              <View style={[styles.newPostsBannerIcon, { backgroundColor: colors.greenDim }]}>
                <Feather name="refresh-cw" size={16} color={colors.green} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.newPostsBannerTitle}>New posts available</Text>
                <Text style={styles.newPostsBannerSub}>Tap to load the latest</Text>
              </View>
              <TouchableOpacity
                style={styles.newPostsBannerClose}
                onPress={handleBannerPress}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="x" size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            </TouchableOpacity>
          </Animated.View>
        )}

        {feedLoading && activePosts.length === 0 ? (
          <FadeSlide delay={100} style={[styles.loadingContainer, { paddingTop: top + HEADER_HEIGHT }]}>
            <ActivityIndicator size="large" color={colors.green} />
            <Text style={styles.loadingText}>Loading posts...</Text>
          </FadeSlide>
        ) : feedError ? (
          <FadeSlide delay={100} style={[styles.errorContainer, { paddingTop: top + HEADER_HEIGHT }]}>
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
          <Animated.FlatList<Post>
            data={activePosts}
            keyExtractor={(item) => item.id}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            renderItem={({ item, index }) => (
              <PostCard
                post={item}
                index={index}
                onReact={(type) => handleReact(item.id, type)}
                onPress={() => {
                  if (item.isSensitive) {
                    setSensitivePost(item);
                  } else {
                    router.push(`/post/${item.id}`);
                  }
                }}
                colors={colors}
              />
            )}
            contentContainerStyle={[styles.list, { paddingBottom: bottom + 100, paddingTop: top + HEADER_HEIGHT + 4 }]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.green} />
            }
            ListHeaderComponent={showFirstPostBanner ? <FirstPostBanner colors={colors} /> : null}
            ListEmptyComponent={
              showFirstPostBanner ? null : (
                <FadeSlide delay={80} style={styles.empty}>
                  <Feather name="wind" size={40} color={colors.textTertiary} />
                  <Text style={styles.emptyTitle}>Nothing here yet</Text>
                  <Text style={styles.emptySub}>Be the first to post something</Text>
                </FadeSlide>
              )
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
              { label: "Scheduled Posts", icon: "clock", route: "/scheduled-posts" },
              { label: "Activity", icon: "bell", route: "/notifications" },
              { label: "Your Identity", icon: "user", route: "/identity" },
              { label: "Usage Insights", icon: "bar-chart-2", route: "/usage-insights" },
              { label: "Settings", icon: "settings", route: "/settings" },
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

        {/* Sensitive Content Warning Modal */}
        <Modal visible={!!sensitivePost} transparent animationType="fade" onRequestClose={() => setSensitivePost(null)}>
          <View style={styles.sensitiveOverlay}>
            <View style={[styles.sensitiveModal, { backgroundColor: colors.cardBg }]}>
              <View style={[styles.sensitiveIconWrap, { backgroundColor: "#FF3B3022" }]}>
                <Feather name="alert-triangle" size={28} color="#FF3B30" />
              </View>
              <Text style={[styles.sensitiveTitle, { color: colors.text }]}>Sensitive Content</Text>
              <Text style={[styles.sensitiveBody, { color: colors.textSecondary }]}>
                This post has been flagged as potentially sensitive. It may contain content some people find upsetting.
              </Text>
              <TouchableOpacity
                style={[styles.sensitiveContinue, { backgroundColor: colors.green }]}
                onPress={() => {
                  const id = sensitivePost?.id;
                  setSensitivePost(null);
                  if (id) router.push(`/post/${id}`);
                }}
              >
                <Text style={styles.sensitiveContinueText}>Continue anyway</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sensitiveBack} onPress={() => setSensitivePost(null)}>
                <Text style={[styles.sensitiveBackText, { color: colors.textSecondary }]}>Go back</Text>
              </TouchableOpacity>
            </View>
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
      borderRadius: 20,
      marginHorizontal: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.09,
      shadowRadius: 12,
      elevation: 4,
    },
    cardAccent: { height: 3, width: "100%" },
    imageWrap: { position: "relative" },
    postImage: { width: "100%", height: 210 },
    moreImagesTag: {
      position: "absolute",
      bottom: 10,
      right: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: "rgba(0,0,0,0.7)",
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    moreImagesText: { color: "#fff", fontSize: 12, fontFamily: "JetBrainsMono_600SemiBold" },
    videoIndicator: {
      position: "absolute",
      top: 10,
      left: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: "rgba(0,0,0,0.65)",
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    videoIndicatorText: { color: "#fff", fontSize: 12, fontFamily: "JetBrainsMono_600SemiBold" },
    videoChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      alignSelf: "flex-start",
      backgroundColor: colors.surface,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 5,
      marginHorizontal: 16,
      marginTop: 12,
    },
    videoChipText: { fontSize: 12, fontFamily: "JetBrainsMono_500Medium", color: colors.textSecondary },
    posterRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 2 },
    posterAvatar: { width: 38, height: 38, borderRadius: 19, justifyContent: "center", alignItems: "center" },
    posterInitials: { fontSize: 13, fontFamily: "JetBrainsMono_700Bold" },
    posterIdText: { fontSize: 13, fontFamily: "JetBrainsMono_600SemiBold", color: colors.text },
    posterTime: { fontSize: 11, fontFamily: "JetBrainsMono_400Regular", color: colors.textTertiary, marginTop: 1 },
    tapHint: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.surface, justifyContent: "center", alignItems: "center" },
    flagBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.surface, justifyContent: "center", alignItems: "center" },
    cardText: { fontSize: 15, fontFamily: "JetBrainsMono_400Regular", color: colors.text, lineHeight: 23, paddingHorizontal: 16, paddingVertical: 10 },
    cardMeta: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
    metaChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
    metaChipText: { fontSize: 12, fontFamily: "JetBrainsMono_500Medium", color: colors.textSecondary },
    voteBarTrack: { flexDirection: "row", height: 7, marginHorizontal: 16, borderRadius: 6, overflow: "hidden", backgroundColor: colors.border + "88" },
    voteBarGreen: { backgroundColor: colors.green },
    voteBarRed: { backgroundColor: "#FF3B30" },
    voteBarLabels: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, marginTop: 6, marginBottom: 4 },
    voteBarPct: { fontSize: 11, fontFamily: "JetBrainsMono_600SemiBold" },
    cardActions: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingBottom: 14, paddingTop: 4 },
    ownPostBanner: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.greenDim,
      paddingHorizontal: 16,
      paddingVertical: 11,
      marginTop: 4,
    },
    ownPostLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
    ownPostDot: { width: 8, height: 8, borderRadius: 4 },
    ownPostLabel: { fontSize: 13, fontFamily: "JetBrainsMono_600SemiBold", color: colors.green },
    ownPostRight: { flexDirection: "row", alignItems: "center", gap: 4 },
    ownPostManage: { fontSize: 13, fontFamily: "JetBrainsMono_500Medium", color: colors.green },
  });
}

function makeStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      height: HEADER_HEIGHT,
      backgroundColor: colors.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
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
    sortBtnText: { fontSize: 14, fontFamily: "JetBrainsMono_500Medium", color: colors.textSecondary },
    sortBtnTextActive: { color: colors.text },
    searchBtn: { padding: 4 },
    list: {},
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      gap: 16,
    },
    loadingText: { fontSize: 15, fontFamily: "JetBrainsMono_400Regular", color: colors.textSecondary },
    errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, paddingHorizontal: 40 },
    errorText: { fontSize: 18, fontFamily: "JetBrainsMono_600SemiBold", color: colors.text },
    errorSub: { fontSize: 13, fontFamily: "JetBrainsMono_400Regular", color: colors.textSecondary, textAlign: "center" },
    retryBtn: {
      marginTop: 8,
      paddingHorizontal: 24,
      paddingVertical: 10,
      backgroundColor: colors.surface,
      borderRadius: 20,
    },
    retryText: { fontSize: 14, fontFamily: "JetBrainsMono_500Medium", color: colors.green },
    empty: { paddingTop: 80, alignItems: "center", gap: 12 },
    emptyTitle: { fontSize: 18, fontFamily: "JetBrainsMono_600SemiBold", color: colors.textSecondary },
    emptySub: { fontSize: 14, fontFamily: "JetBrainsMono_400Regular", color: colors.textTertiary },
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
    newPostsBannerWrap: {
      position: "absolute",
      left: 16,
      right: 16,
      zIndex: 9,
    },
    newPostsBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
      backgroundColor: colors.cardBg,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.green + "40",
      shadowColor: colors.green,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 14,
      elevation: 10,
    },
    newPostsBannerIcon: {
      width: 38,
      height: 38,
      borderRadius: 19,
      justifyContent: "center",
      alignItems: "center",
    },
    newPostsBannerTitle: {
      fontSize: 14,
      fontFamily: "JetBrainsMono_700Bold",
      color: colors.text,
    },
    newPostsBannerSub: {
      fontSize: 12,
      fontFamily: "JetBrainsMono_400Regular",
      color: colors.textSecondary,
      marginTop: 1,
    },
    newPostsBannerClose: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.surface,
      justifyContent: "center",
      alignItems: "center",
    },
    newPostsBannerText: {
      fontSize: 12,
      fontFamily: "JetBrainsMono_600SemiBold",
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
    menuLabel: { fontSize: 15, fontFamily: "JetBrainsMono_500Medium", color: colors.text },
    sensitiveOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 32 },
    sensitiveModal: { borderRadius: 20, padding: 28, alignItems: "center", width: "100%", maxWidth: 340 },
    sensitiveIconWrap: { width: 60, height: 60, borderRadius: 30, justifyContent: "center", alignItems: "center", marginBottom: 16 },
    sensitiveTitle: { fontSize: 18, fontFamily: "JetBrainsMono_700Bold", marginBottom: 10, textAlign: "center" },
    sensitiveBody: { fontSize: 14, fontFamily: "JetBrainsMono_400Regular", textAlign: "center", lineHeight: 20, marginBottom: 24 },
    sensitiveContinue: { width: "100%", paddingVertical: 14, borderRadius: 12, alignItems: "center", marginBottom: 10 },
    sensitiveContinueText: { fontSize: 15, fontFamily: "JetBrainsMono_600SemiBold", color: "#fff" },
    sensitiveBack: { paddingVertical: 10, alignItems: "center" },
    sensitiveBackText: { fontSize: 14, fontFamily: "JetBrainsMono_500Medium" },
  });
}
