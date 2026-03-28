import React, { useCallback } from "react";
import {
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import EmptyFeed from "@/components/EmptyFeed";
import Header from "@/components/Header";
import PostCard from "@/components/PostCard";
import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import { timeAgo } from "@/utils/time";

export default function FeedScreen() {
  const { getActivePosts, reactions, reactToPost, tempUserId } = useApp();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const posts = getActivePosts();

  const bottomPadding = isWeb ? 34 : insets.bottom;

  const renderItem = useCallback(
    ({ item }: { item: ReturnType<typeof getActivePosts>[0] }) => (
      <PostCard
        post={item}
        reaction={reactions[item.id]}
        onReact={(type) => reactToPost(item.id, type)}
        timeAgo={timeAgo(item.createdAt)}
      />
    ),
    [reactions, reactToPost]
  );

  return (
    <View style={styles.container}>
      <Header
        userId={tempUserId}
        right={
          <View style={styles.liveDot}>
            <View style={styles.dot} />
            <Text style={styles.liveText}>live</Text>
          </View>
        }
      />

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: bottomPadding + (isWeb ? 84 : 90) },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={posts.length > 0}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={<EmptyFeed />}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => {}}
            tintColor={Colors.textTertiary}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  separator: {
    height: 0,
  },
  liveDot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.worthIt,
  },
  liveText: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontFamily: "Inter_400Regular",
  },
});
