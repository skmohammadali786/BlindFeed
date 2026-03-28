import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { Post, useApp } from "@/context/AppContext";
import { timeAgo } from "@/utils/time";

type SortMode = "fresh" | "top";

function PostCard({
  post,
  reaction,
  onReact,
  onPress,
}: {
  post: Post;
  reaction?: "worthit" | "skip";
  onReact: (type: "worthit" | "skip") => void;
  onPress: () => void;
}) {
  const handleReact = (type: "worthit" | "skip") => {
    if (reaction) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onReact(type);
  };

  const myWorthIt = reaction === "worthit";
  const mySkip = reaction === "skip";

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <Text style={styles.cardText}>{post.content}</Text>
      <Text style={styles.cardTime}>{timeAgo(post.createdAt)}</Text>
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[
            styles.actionBtn,
            myWorthIt && styles.actionBtnWorthItActive,
          ]}
          onPress={() => handleReact("worthit")}
          activeOpacity={0.75}
          disabled={!!reaction}
        >
          <Feather
            name="check"
            size={14}
            color={myWorthIt ? Colors.green : Colors.textSecondary}
          />
          <Text
            style={[
              styles.actionBtnText,
              myWorthIt && styles.actionBtnTextWorthIt,
            ]}
          >
            Worth it{"  "}
            <Text style={[styles.actionCount, myWorthIt && { color: Colors.green }]}>
              ({post.worthItCount})
            </Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionBtn,
            mySkip && styles.actionBtnSkipActive,
          ]}
          onPress={() => handleReact("skip")}
          activeOpacity={0.75}
          disabled={!!reaction}
        >
          <Feather
            name="x"
            size={14}
            color={mySkip ? "#FF453A" : Colors.textSecondary}
          />
          <Text
            style={[
              styles.actionBtnText,
              mySkip && styles.actionBtnTextSkip,
            ]}
          >
            Skip{"  "}
            <Text style={[styles.actionCount, mySkip && { color: "#FF453A" }]}>
              ({post.skipCount})
            </Text>
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function AvatarMenu({
  visible,
  onClose,
  userId,
}: {
  visible: boolean;
  onClose: () => void;
  userId: string;
}) {
  const items = [
    { icon: "user", label: "Your ID", sub: userId, onPress: () => { onClose(); router.push("/identity"); } },
    { icon: "settings", label: "Settings", sub: null, onPress: () => { onClose(); router.push("/settings"); } },
    { icon: "bar-chart-2", label: "Usage Insights", sub: null, onPress: () => { onClose(); router.push("/usage-insights"); } },
    { icon: "shield", label: "Community Guidelines", sub: null, onPress: () => { onClose(); router.push("/community-guidelines"); } },
    { icon: "flag", label: "Report Content", sub: null, onPress: () => { onClose(); router.push("/report"); } },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={menuStyles.overlay}>
          <TouchableWithoutFeedback>
            <View style={menuStyles.menu}>
              {/* User badge */}
              <View style={menuStyles.userBadge}>
                <View style={menuStyles.avatarSmall}>
                  <Feather name="smile" size={16} color={Colors.green} />
                </View>
                <View>
                  <Text style={menuStyles.userIdLabel}>Anonymous</Text>
                  <Text style={menuStyles.userId}>{userId}</Text>
                </View>
              </View>
              <View style={menuStyles.divider} />
              {items.map((item, idx) => (
                <React.Fragment key={item.label}>
                  <TouchableOpacity style={menuStyles.item} onPress={item.onPress} activeOpacity={0.75}>
                    <View style={menuStyles.itemIcon}>
                      <Feather name={item.icon as any} size={17} color={Colors.textSecondary} />
                    </View>
                    <Text style={menuStyles.itemLabel}>{item.label}</Text>
                    <Feather name="chevron-right" size={15} color={Colors.textTertiary} />
                  </TouchableOpacity>
                  {idx < items.length - 1 && <View style={menuStyles.itemDivider} />}
                </React.Fragment>
              ))}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

export default function FeedScreen() {
  const { getActivePosts, reactions, reactToPost, tempUserId } = useApp();
  const [sort, setSort] = useState<SortMode>("fresh");
  const [showMenu, setShowMenu] = useState(false);
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const top = isWeb ? 67 : insets.top;
  const bottom = isWeb ? 34 : insets.bottom;

  const posts = getActivePosts(sort);

  const renderItem = useCallback(
    ({ item }: { item: Post }) => (
      <PostCard
        post={item}
        reaction={reactions[item.id]}
        onReact={(type) => reactToPost(item.id, type)}
        onPress={() => router.push({ pathname: "/post/[id]", params: { id: item.id } })}
      />
    ),
    [reactions, reactToPost]
  );

  return (
    <View style={[styles.container]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: top }]}>
        <Text style={styles.headerTitle}>BlindFeed</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerIcon}
            onPress={() => router.push("/search")}
          >
            <Feather name="search" size={20} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon}>
            <Feather name="bell" size={20} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.avatarBtn}
            onPress={() => setShowMenu(true)}
          >
            <Feather name="smile" size={18} color={Colors.green} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Sort toggle */}
      <View style={styles.toggleContainer}>
        <View style={styles.toggle}>
          <TouchableOpacity
            style={[styles.toggleOption, sort === "fresh" && styles.toggleOptionActive]}
            onPress={() => setSort("fresh")}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.toggleText,
                sort === "fresh" && styles.toggleTextActive,
              ]}
            >
              Fresh
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleOption, sort === "top" && styles.toggleOptionActive]}
            onPress={() => setSort("top")}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.toggleText,
                sort === "top" && styles.toggleTextActive,
              ]}
            >
              Top
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Feed */}
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIconBg}>
              <Feather name="eye-off" size={28} color={Colors.textTertiary} />
            </View>
            <Text style={styles.emptyText}>No posts yet</Text>
            <Text style={styles.emptySubText}>Be the first to share something real</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push("/create")}
              activeOpacity={0.85}
            >
              <Text style={styles.emptyBtnText}>Create Post</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: bottom + (isWeb ? 84 : 28) }]}
        onPress={() => router.push("/create")}
        activeOpacity={0.85}
      >
        <Feather name="plus" size={26} color="#000" />
      </TouchableOpacity>

      {/* Avatar menu */}
      <AvatarMenu
        visible={showMenu}
        onClose={() => setShowMenu(false)}
        userId={tempUserId}
      />
    </View>
  );
}

const menuStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
    padding: 16,
    paddingBottom: 40,
  },
  menu: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    overflow: "hidden",
  },
  userBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 18,
  },
  avatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.greenDim,
    borderWidth: 1.5,
    borderColor: Colors.green,
    justifyContent: "center",
    alignItems: "center",
  },
  userIdLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  userId: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 15,
    gap: 14,
  },
  itemIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: "center",
    alignItems: "center",
  },
  itemLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
  itemDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 64,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: Colors.background,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.greenDim,
    borderWidth: 1.5,
    borderColor: Colors.green,
    justifyContent: "center",
    alignItems: "center",
  },
  toggleContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  toggle: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 3,
  },
  toggleOption: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  toggleOptionActive: {
    backgroundColor: Colors.green,
  },
  toggleText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  toggleTextActive: {
    color: "#000000",
    fontFamily: "Inter_600SemiBold",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  separator: {
    height: 10,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    gap: 10,
  },
  cardText: {
    fontSize: 17,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    lineHeight: 26,
  },
  cardTime: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  cardActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 42,
    borderRadius: 10,
    backgroundColor: Colors.surfaceElevated,
  },
  actionBtnWorthItActive: {
    backgroundColor: "rgba(61, 219, 133, 0.12)",
  },
  actionBtnSkipActive: {
    backgroundColor: "rgba(255, 69, 58, 0.12)",
  },
  actionBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  actionBtnTextWorthIt: {
    color: Colors.green,
  },
  actionBtnTextSkip: {
    color: "#FF453A",
  },
  actionCount: {
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
    gap: 12,
  },
  emptyIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  emptySubText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    textAlign: "center",
  },
  emptyBtn: {
    marginTop: 8,
    backgroundColor: Colors.green,
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  emptyBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#000",
  },
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.green,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});
