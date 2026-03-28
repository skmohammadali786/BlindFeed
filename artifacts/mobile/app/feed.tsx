import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { Post, useApp } from "@/context/AppContext";
import { getObjectUrl } from "@/utils/api";
import { timeAgo } from "@/utils/time";

type SortMode = "fresh" | "top";

function PostCard({
  post,
  onReact,
  onPress,
  colors,
}: {
  post: Post;
  onReact: (type: "worthit" | "skip") => void;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  const reaction = post.myReaction;
  const myWorthIt = reaction === "worthit";
  const mySkip = reaction === "skip";
  const total = post.worthItCount + post.skipCount;
  const worthPct = total > 0 ? Math.round((post.worthItCount / total) * 100) : 0;

  const handleReact = (type: "worthit" | "skip") => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onReact(type);
  };

  const styles = makeCardStyles(colors);

  return (
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
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionBtn, myWorthIt && { backgroundColor: colors.greenDim, borderColor: colors.green }]}
          onPress={() => handleReact("worthit")}
          activeOpacity={0.75}
        >
          <Feather name="check" size={14} color={myWorthIt ? colors.green : colors.textSecondary} />
          <Text style={[styles.actionBtnText, myWorthIt && { color: colors.green }]}>
            Worth it{"  "}
            <Text style={[styles.actionCount, myWorthIt && { color: colors.green }]}>
              ({post.worthItCount})
            </Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, mySkip && { backgroundColor: "rgba(255,59,48,0.1)", borderColor: "#FF3B30" }]}
          onPress={() => handleReact("skip")}
          activeOpacity={0.75}
        >
          <Feather name="x" size={14} color={mySkip ? "#FF3B30" : colors.textSecondary} />
          <Text style={[styles.actionBtnText, mySkip && { color: "#FF3B30" }]}>
            Skip{"  "}
            <Text style={[styles.actionCount, mySkip && { color: "#FF3B30" }]}>
              ({post.skipCount})
            </Text>
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

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

  const posts = getActivePosts(sortMode);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshFeed(sortMode);
    setRefreshing(false);
  }, [refreshFeed, sortMode]);

  const handleSortChange = useCallback((mode: SortMode) => {
    setSortMode(mode);
    refreshFeed(mode);
  }, [refreshFeed]);

  const handleReact = useCallback((postId: string, type: "worthit" | "skip") => {
    reactToPost(postId, type);
  }, [reactToPost]);

  const styles = makeStyles(colors);

  return (
    <View style={[styles.container, { paddingTop: top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.avatarBtn}>
          <View style={styles.avatar}>
            <Feather name="user" size={16} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>

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

        <TouchableOpacity onPress={() => router.push("/search")} style={styles.searchBtn}>
          <Feather name="search" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {feedLoading && posts.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.green} />
          <Text style={styles.loadingText}>Loading posts...</Text>
        </View>
      ) : feedError ? (
        <View style={styles.errorContainer}>
          <Feather name="wifi-off" size={40} color={colors.textTertiary} />
          <Text style={styles.errorText}>Couldn't load posts</Text>
          <Text style={styles.errorSub}>{feedError}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refreshFeed(sortMode)}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onReact={(type) => handleReact(item.id, type)}
              onPress={() => router.push(`/post/${item.id}`)}
              colors={colors}
            />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: bottom + 80 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.green}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="wind" size={40} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>Nothing here yet</Text>
              <Text style={styles.emptySub}>Be the first to post something</Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: bottom + 20 }]}
        onPress={() => router.push("/create")}
        activeOpacity={0.85}
      >
        <Feather name="edit-3" size={22} color="#000" />
      </TouchableOpacity>

      {/* Avatar Menu */}
      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
          <View style={styles.menuOverlay} />
        </TouchableWithoutFeedback>
        <View style={[styles.menuContainer, { top: top + 56 }]}>
          {[
            { label: "Your Identity", icon: "user", route: "/identity" },
            { label: "Settings", icon: "settings", route: "/settings" },
            { label: "Usage Insights", icon: "bar-chart-2", route: "/usage-insights" },
            { label: "Community Guidelines", icon: "book-open", route: "/community-guidelines" },
            { label: "Report Content", icon: "flag", route: "/report" },
          ].map((item) => (
            <TouchableOpacity
              key={item.route}
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                router.push(item.route as never);
              }}
            >
              <Feather name={item.icon as never} size={16} color={colors.text} />
              <Text style={styles.menuLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
    </View>
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
    postImage: {
      width: "100%",
      height: 180,
      borderRadius: 10,
    },
    cardText: {
      fontSize: 16,
      fontFamily: "Inter_400Regular",
      color: colors.text,
      lineHeight: 24,
    },
    cardMeta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    cardTime: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
    },
    commentPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    commentCount: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
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
    cardActions: {
      flexDirection: "row",
      gap: 8,
    },
    actionBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.buttonBg,
    },
    actionBtnText: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: colors.textSecondary,
    },
    actionCount: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
    },
  });
}

function makeStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
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
    sortToggle: {
      flexDirection: "row",
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 3,
    },
    sortBtn: {
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 17,
    },
    sortBtnActive: {
      backgroundColor: colors.surfaceElevated,
    },
    sortBtnText: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.textSecondary,
    },
    sortBtnTextActive: {
      color: colors.text,
    },
    searchBtn: { padding: 4 },
    list: { paddingTop: 4 },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      gap: 16,
    },
    loadingText: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 40,
    },
    errorText: {
      fontSize: 18,
      fontFamily: "Inter_600SemiBold",
      color: colors.text,
    },
    errorSub: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
      textAlign: "center",
    },
    retryBtn: {
      marginTop: 8,
      paddingHorizontal: 24,
      paddingVertical: 10,
      backgroundColor: colors.surface,
      borderRadius: 20,
    },
    retryText: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.green,
    },
    empty: {
      paddingTop: 80,
      alignItems: "center",
      gap: 12,
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
    },
    fab: {
      position: "absolute",
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: "#3DDB85",
      justifyContent: "center",
      alignItems: "center",
      shadowColor: "#3DDB85",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 8,
    },
    menuOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
    },
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
    menuLabel: {
      fontSize: 15,
      fontFamily: "Inter_500Medium",
      color: colors.text,
    },
  });
}
