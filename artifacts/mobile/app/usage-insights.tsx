import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";

function StatCard({
  icon,
  value,
  label,
  color,
}: {
  icon: string;
  value: string;
  label: string;
  color?: string;
}) {
  return (
    <View style={styles.statCard}>
      <Feather name={icon as any} size={20} color={color ?? Colors.green} />
      <Text style={[styles.statValue, color ? { color } : {}]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

export default function UsageInsightsScreen() {
  const { getMyPosts, reactions, sessionSeconds } = useApp();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const top = isWeb ? 67 : insets.top;
  const bottom = isWeb ? 34 : insets.bottom > 0 ? insets.bottom : 16;

  const myPosts = getMyPosts();
  const reactionCount = Object.keys(reactions).length;
  const timeStr = formatTime(sessionSeconds);

  const worthItCount = Object.values(reactions).filter((r) => r === "worthit").length;
  const skipCount = Object.values(reactions).filter((r) => r === "skip").length;
  const totalReactions = worthItCount + skipCount;
  const worthItPct = totalReactions > 0 ? Math.round((worthItCount / totalReactions) * 100) : 0;

  return (
    <View style={[styles.container, { paddingTop: top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Usage Insights</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Your Activity</Text>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatCard
            icon="edit-3"
            value={String(myPosts.length)}
            label="Posts"
            color={Colors.green}
          />
          <StatCard
            icon="zap"
            value={String(reactionCount)}
            label="Reactions"
            color="#FFD60A"
          />
          <StatCard
            icon="clock"
            value={timeStr}
            label="This session"
            color={Colors.textSecondary}
          />
        </View>

        {/* Reaction breakdown */}
        {reactionCount > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your Reactions</Text>
            <View style={styles.reactionRow}>
              <View style={styles.reactionItem}>
                <Feather name="check" size={16} color={Colors.green} />
                <Text style={styles.reactionCount}>{worthItCount}</Text>
                <Text style={styles.reactionLabel}>Worth it</Text>
              </View>
              <View style={styles.reactionDivider} />
              <View style={styles.reactionItem}>
                <Feather name="x" size={16} color="#FF453A" />
                <Text style={styles.reactionCount}>{skipCount}</Text>
                <Text style={styles.reactionLabel}>Skip</Text>
              </View>
            </View>
            {totalReactions > 0 && (
              <>
                <View style={styles.progressBar}>
                  <View
                    style={[styles.progressFill, { width: `${worthItPct}%` as any }]}
                  />
                </View>
                <Text style={styles.progressLabel}>
                  {worthItPct}% Worth it
                </Text>
              </>
            )}
          </View>
        )}

        {/* My posts */}
        {myPosts.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>My Posts</Text>
            {myPosts.map((post) => {
              const total = post.worthItCount + post.skipCount;
              const pct = total > 0 ? Math.round((post.worthItCount / total) * 100) : 0;
              return (
                <TouchableOpacity
                  key={post.id}
                  style={styles.postItem}
                  onPress={() =>
                    router.push({ pathname: "/post/[id]", params: { id: post.id } })
                  }
                  activeOpacity={0.8}
                >
                  <Text style={styles.postItemText} numberOfLines={2}>
                    {post.content}
                  </Text>
                  <View style={styles.postItemMeta}>
                    <View style={styles.postItemStat}>
                      <Feather name="check" size={12} color={Colors.green} />
                      <Text style={styles.postItemStatText}>{post.worthItCount}</Text>
                    </View>
                    <View style={styles.postItemStat}>
                      <Feather name="x" size={12} color={Colors.textTertiary} />
                      <Text style={styles.postItemStatText}>{post.skipCount}</Text>
                    </View>
                    {total > 0 && (
                      <Text style={styles.postItemPct}>{pct}% worth it</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {myPosts.length === 0 && reactionCount === 0 && (
          <View style={styles.emptyState}>
            <Feather name="bar-chart-2" size={40} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>No activity yet</Text>
            <Text style={styles.emptySub}>Post something or react to see your stats here</Text>
            <TouchableOpacity
              style={styles.postBtn}
              onPress={() => router.push("/create")}
              activeOpacity={0.85}
            >
              <Text style={styles.postBtnText}>Create a post</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Privacy note */}
        <View style={styles.privacyNote}>
          <Feather name="shield" size={14} color={Colors.textTertiary} />
          <Text style={styles.privacyText}>
            All stats are stored locally on your device. We never track you.
          </Text>
        </View>
      </ScrollView>
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
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    gap: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    gap: 6,
  },
  statValue: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textTertiary,
    textAlign: "center",
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  reactionRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  reactionItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  reactionDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
    marginHorizontal: 16,
  },
  reactionCount: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  reactionLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: 6,
    backgroundColor: Colors.green,
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  postItem: {
    gap: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  postItemText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    lineHeight: 21,
  },
  postItemMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  postItemStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  postItemStatText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  postItemPct: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.green,
    marginLeft: "auto",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  emptySub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    textAlign: "center",
    lineHeight: 21,
    paddingHorizontal: 20,
  },
  postBtn: {
    marginTop: 8,
    backgroundColor: Colors.green,
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  postBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#000",
  },
  privacyNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingTop: 8,
  },
  privacyText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    lineHeight: 18,
  },
});
