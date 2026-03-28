import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
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
}: {
  post: Post;
  reaction?: "worthit" | "skip";
  onReact: (type: "worthit" | "skip") => void;
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
    <View style={styles.card}>
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
            <Text style={styles.actionCount}>({post.worthItCount})</Text>
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
            <Text style={styles.actionCount}>({post.skipCount})</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function FeedScreen() {
  const { getActivePosts, reactions, reactToPost, tempUserId } = useApp();
  const [sort, setSort] = useState<SortMode>("fresh");
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
          <TouchableOpacity style={styles.headerIcon}>
            <Feather name="search" size={20} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon}>
            <Feather name="bell" size={20} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.avatarBtn}>
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
            <Feather name="eye-off" size={40} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>Nothing here yet</Text>
            <Text style={styles.emptySubText}>Be the first to share something.</Text>
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
    </View>
  );
}

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
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  emptySubText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    textAlign: "center",
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
